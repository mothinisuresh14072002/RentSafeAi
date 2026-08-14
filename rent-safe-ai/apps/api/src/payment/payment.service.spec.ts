import { BadRequestException } from '@nestjs/common';
import { createHmac } from 'crypto';
import { PaymentStatus } from '@prisma/client';
import { SandboxPaymentProvider } from './sandbox-payment.provider';
import { PaymentService } from './payment.service';

describe('PaymentService safety guarantees', () => {
  const payload = { eventId: 'evt-1', providerOrderId: 'sandbox-key-1', status: PaymentStatus.AUTHORIZED };
  const signature = createHmac('sha256', 'rentsafe-sandbox-webhook-secret').update(JSON.stringify(payload)).digest('hex');

  it('rejects a forged webhook signature', async () => {
    const service = new PaymentService({} as any, {} as any, new SandboxPaymentProvider(), {} as any);
    await expect(service.handleWebhook('forged', payload)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('does not duplicate a replayed provider event', async () => {
    const tx = { paymentOrder: { findUnique: jest.fn().mockResolvedValue({ id: 'order-1', status: PaymentStatus.CREATED }) }, paymentWebhookEvent: { create: jest.fn().mockRejectedValue({ code: 'P2002' }) } };
    const prisma = { $transaction: jest.fn((fn: any) => fn(tx)) };
    const service = new PaymentService(prisma as any, {} as any, new SandboxPaymentProvider(), {} as any);
    await expect(service.handleWebhook(signature, payload)).resolves.toEqual({ replay: true });
    expect(tx.paymentWebhookEvent.create).toHaveBeenCalledTimes(1);
  });

  it('returns the already-created order when a concurrent idempotency insert loses the race', async () => {
    const existing = { id: 'order-1', tenantId: 'tenant-1', listingId: 'listing-1', amount: 1000 };
    const tx = { paymentOrder: { create: jest.fn().mockRejectedValue({ code: 'P2002' }) } };
    const prisma = { paymentOrder: { findUnique: jest.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(existing) }, $transaction: jest.fn((fn: any) => fn(tx)) };
    const eligibility = { assertEligible: jest.fn().mockResolvedValue({ eligible: true, items: [] }) };
    const service = new PaymentService(prisma as any, eligibility as any, new SandboxPaymentProvider(), {} as any);
    await expect(service.createOrder('tenant-1', { listingId: 'listing-1', agreementId: 'agreement-1', amount: 1000, idempotencyKey: 'key-1' })).resolves.toEqual(existing);
  });

  it('does not create an order when eligibility is lost', async () => {
    const prisma = { paymentOrder: { findUnique: jest.fn().mockResolvedValue(null) }, $transaction: jest.fn() };
    const eligibility = { assertEligible: jest.fn().mockRejectedValue(new BadRequestException({ code: 'PAYMENT_NOT_ELIGIBLE', items: [{ code: 'NO_HARD_FRAUD_HOLD', passed: false }] })) };
    const service = new PaymentService(prisma as any, eligibility as any, new SandboxPaymentProvider(), {} as any);
    await expect(service.createOrder('tenant-1', { listingId: 'listing-1', agreementId: 'agreement-1', amount: 1000, idempotencyKey: 'key-2' })).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
