import {
  BadRequestException,
  ConflictException,
  Injectable,
  Inject,
  NotFoundException,
} from '@nestjs/common';
import { PaymentStatus } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import type { PaymentProvider } from './payment-provider';
import { PaymentEligibilityService } from './payment-eligibility.service';

const transitions: Record<PaymentStatus, PaymentStatus[]> = {
  CREATED: [
    PaymentStatus.AUTHORIZED,
    PaymentStatus.FAILED,
    PaymentStatus.DISPUTED,
  ],
  AUTHORIZED: [
    PaymentStatus.CAPTURED,
    PaymentStatus.FAILED,
    PaymentStatus.REFUND_PENDING,
    PaymentStatus.DISPUTED,
  ],
  CAPTURED: [PaymentStatus.REFUND_PENDING, PaymentStatus.DISPUTED],
  FAILED: [],
  REFUND_PENDING: [PaymentStatus.REFUNDED, PaymentStatus.FAILED],
  REFUNDED: [],
  DISPUTED: [PaymentStatus.REFUND_PENDING],
};

@Injectable()
export class PaymentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eligibility: PaymentEligibilityService,
    @Inject('PAYMENT_PROVIDER') private readonly provider: PaymentProvider,
    private readonly audit: AuditService,
  ) {}
  async eligibilityFor(
    tenantId: string,
    listingId: string,
    agreementId: string,
    amount: number,
  ) {
    return this.eligibility.evaluate({
      tenantId,
      listingId,
      agreementId,
      amount,
    });
  }

  async createOrder(
    tenantId: string,
    input: {
      listingId: string;
      agreementId: string;
      amount: number;
      idempotencyKey: string;
    },
  ) {
    if (!input.idempotencyKey || input.idempotencyKey.length > 100)
      throw new BadRequestException('A valid idempotency key is required');
    const existing = await this.prisma.paymentOrder.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
    });
    if (existing) {
      if (
        existing.tenantId !== tenantId ||
        existing.listingId !== input.listingId ||
        existing.amount !== input.amount
      )
        throw new ConflictException(
          'Idempotency key was already used for another order',
        );
      return existing;
    }
    await this.eligibility.assertEligible({
      tenantId,
      listingId: input.listingId,
      agreementId: input.agreementId,
      amount: input.amount,
    });
    try {
      return await this.prisma.$transaction(async (tx) => {
        const eligibility = await this.eligibility.assertEligible(
          {
            tenantId,
            listingId: input.listingId,
            agreementId: input.agreementId,
            amount: input.amount,
          },
          tx,
        );
        const order = await tx.paymentOrder.create({
          data: {
            tenantId,
            listingId: input.listingId,
            agreementId: input.agreementId,
            amount: input.amount,
            idempotencyKey: input.idempotencyKey,
            status: PaymentStatus.CREATED,
            eligibilitySnapshot: eligibility as any,
          },
        });
        const providerOrder = await this.provider.createOrder({
          orderId: order.id,
          amount: order.amount,
          currency: order.currency,
          idempotencyKey: input.idempotencyKey,
        });
        const updated = await tx.paymentOrder.update({
          where: { id: order.id },
          data: { providerOrderId: providerOrder.providerOrderId },
        });
        await tx.paymentTransaction.create({
          data: {
            orderId: order.id,
            providerReference: providerOrder.providerOrderId,
            status: PaymentStatus.CREATED,
            eventType: 'ORDER_CREATED',
            metadata: { sandbox: providerOrder.sandbox },
          },
        });
        await this.audit.log(tx, {
          actorId: tenantId,
          action: 'PAYMENT_ORDER_CREATED',
          entityType: 'PAYMENT_ORDER',
          entityId: order.id,
        });
        return updated;
      });
    } catch (e: any) {
      if (e?.code === 'P2002') {
        const retry = await this.prisma.paymentOrder.findUnique({
          where: { idempotencyKey: input.idempotencyKey },
        });
        if (retry) return retry;
      }
      throw e;
    }
  }

  async handleWebhook(
    signature: string,
    payload: {
      eventId: string;
      providerOrderId: string;
      status: PaymentStatus;
      providerReference?: string;
      metadata?: any;
    },
  ) {
    if (!this.provider.verifyWebhookSignature(payload, signature))
      throw new BadRequestException('Invalid payment webhook signature');
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.paymentOrder.findUnique({
        where: { providerOrderId: payload.providerOrderId },
        select: { id: true, status: true, tenantId: true },
      });
      if (!order) throw new NotFoundException('Payment order not found');
      try {
        await tx.paymentWebhookEvent.create({
          data: {
            eventId: payload.eventId,
            orderId: order.id,
            eventType: `PAYMENT_${payload.status}`,
            payload: payload as any,
          },
        });
      } catch (e: any) {
        if (e?.code === 'P2002') return { replay: true };
        throw e;
      }
      this.assertTransition(order.status, payload.status);
      const updated = await tx.paymentOrder.update({
        where: { id: order.id },
        data: { status: payload.status },
      });
      await tx.outboxEvent.create({
        data: {
          eventType: 'NOTIFICATION_REQUESTED',
          payload: {
            userId: order.tenantId,
            title: 'Payment update',
            body: `Your payment is now ${payload.status.toLowerCase()}.`,
            eventType: 'PAYMENT_STATUS_CHANGED',
            deduplicationKey: `payment:${order.id}:${payload.status}`,
            channels: ['IN_APP', 'EMAIL'],
          } as any,
        },
      });
      await tx.paymentTransaction.create({
        data: {
          orderId: order.id,
          providerReference:
            payload.providerReference || payload.providerOrderId,
          status: payload.status,
          eventType: `WEBHOOK_${payload.status}`,
          metadata: payload.metadata,
        },
      });
      return { replay: false, order: updated };
    });
  }

  async refund(orderId: string, actorId: string, reason: string) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.paymentOrder.findUnique({
        where: { id: orderId },
      });
      if (!order || order.status !== PaymentStatus.CAPTURED)
        throw new BadRequestException('Only captured orders can be refunded');
      const updated = await tx.paymentOrder.update({
        where: { id: orderId },
        data: { status: PaymentStatus.REFUND_PENDING },
      });
      await tx.refund.create({
        data: { orderId, amount: order.amount, status: 'PENDING' },
      });
      await tx.paymentTransaction.create({
        data: {
          orderId,
          providerReference: order.providerOrderId || order.id,
          status: PaymentStatus.REFUND_PENDING,
          eventType: 'REFUND_REQUESTED',
          metadata: { reason },
        },
      });
      await this.audit.log(tx, {
        actorId,
        action: 'PAYMENT_REFUND_MANUAL',
        entityType: 'PAYMENT_ORDER',
        entityId: orderId,
        reason,
      });
      return updated;
    });
  }
  async dispute(orderId: string, actorId: string, reason: string) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.paymentOrder.findUnique({
        where: { id: orderId },
      });
      if (!order) throw new NotFoundException('Payment order not found');
      this.assertTransition(order.status, PaymentStatus.DISPUTED);
      const updated = await tx.paymentOrder.update({
        where: { id: orderId },
        data: { status: PaymentStatus.DISPUTED },
      });
      await tx.paymentTransaction.create({
        data: {
          orderId,
          providerReference: order.providerOrderId || order.id,
          status: PaymentStatus.DISPUTED,
          eventType: 'DISPUTE_OPENED',
          metadata: { reason },
        },
      });
      await this.audit.log(tx, {
        actorId,
        action: 'PAYMENT_DISPUTED',
        entityType: 'PAYMENT_ORDER',
        entityId: orderId,
        reason,
      });
      return updated;
    });
  }
  async history(tenantId: string) {
    return this.prisma.paymentOrder.findMany({
      where: { tenantId },
      select: {
        id: true,
        amount: true,
        currency: true,
        status: true,
        createdAt: true,
        refunds: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }
  async ownerSummary(ownerId: string) {
    return this.prisma.paymentOrder.findMany({
      where: { listing: { property: { ownerId } } },
      select: {
        id: true,
        listingId: true,
        amount: true,
        currency: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }
  async adminOrders() {
    return this.prisma.paymentOrder.findMany({
      select: {
        id: true,
        listingId: true,
        tenantId: true,
        amount: true,
        status: true,
        createdAt: true,
        paymentHolds: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }
  async createViewingException(
    adminId: string,
    input: {
      listingId: string;
      tenantId: string;
      reason: string;
      expiresAt: string;
    },
  ) {
    if (!input.reason?.trim())
      throw new BadRequestException('Reason is required');
    const exception = await this.prisma.paymentEligibilityException.create({
      data: {
        listingId: input.listingId,
        tenantId: input.tenantId,
        approvedBy: adminId,
        reason: input.reason.trim(),
        expiresAt: new Date(input.expiresAt),
      },
    });
    await this.audit.log(this.prisma, {
      actorId: adminId,
      action: 'PAYMENT_VIEWING_EXCEPTION_CREATED',
      entityType: 'PAYMENT_ELIGIBILITY_EXCEPTION',
      entityId: exception.id,
      reason: input.reason.trim(),
    });
    return exception;
  }
  async adminTimeline(orderId: string) {
    return this.prisma.paymentOrder.findUnique({
      where: { id: orderId },
      include: {
        transactions: { orderBy: { createdAt: 'asc' } },
        webhookEvents: { orderBy: { createdAt: 'asc' } },
        refunds: true,
        paymentHolds: true,
      },
    });
  }
  private assertTransition(from: PaymentStatus, to: PaymentStatus) {
    if (!transitions[from].includes(to) && from !== to)
      throw new ConflictException(
        `Invalid payment state transition ${from} -> ${to}`,
      );
  }
}
