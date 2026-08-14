import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { PaymentStatus, PublishStatus, ReportStatus, UserStatus, VerificationStatus } from '@prisma/client';

export type SafetyAction = 'SUSPEND' | 'EXPIRE' | 'REVERIFY' | 'REINSTATE';

@Injectable()
export class SafetyService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  async suspendUser(userId: string, actorId: string, reason: string) {
    return this.transitionUser(userId, actorId, 'SUSPEND', reason);
  }

  async overrideUser(userId: string, actorId: string, action: SafetyAction, reason: string) {
    if (!reason?.trim()) throw new BadRequestException('An override reason is required');
    return this.transitionUser(userId, actorId, action, reason);
  }

  async scanExpired() {
    const now = new Date();
    const expired = await this.prisma.propertyVerification.findMany({ where: { expiryDate: { lte: now }, status: VerificationStatus.VERIFIED }, select: { id: true, propertyId: true } });
    for (const verification of expired) {
      await this.prisma.$transaction(async (tx) => {
        await tx.propertyVerification.update({ where: { id: verification.id }, data: { status: VerificationStatus.EXPIRED } });
        const event = await tx.outboxEvent.create({ data: { eventType: 'SAFETY_PROPERTY_CHANGED', payload: { propertyId: verification.propertyId, reason: 'Verification expired; re-verification required', actorId: 'SYSTEM' } } });
        await this.propagateProperty(tx, verification.propertyId, 'Verification expired; re-verification required', 'SYSTEM');
        await tx.outboxEvent.update({ where: { id: event.id }, data: { processedAt: new Date() } });
      });
    }

    const expiredKyc = await this.prisma.ownerKycCase.findMany({ where: { expiryDate: { lte: now }, status: VerificationStatus.VERIFIED }, select: { id: true, userId: true } });
    for (const kyc of expiredKyc) {
      await this.prisma.$transaction(async (tx) => {
        await tx.ownerKycCase.update({ where: { id: kyc.id }, data: { status: VerificationStatus.EXPIRED } });
        const event = await tx.outboxEvent.create({ data: { eventType: 'SAFETY_USER_CHANGED', payload: { userId: kyc.userId, reason: 'Owner verification expired; re-verification required', actorId: 'SYSTEM' } } });
        await this.propagateUser(tx, kyc.userId, 'Owner verification expired; re-verification required', 'SYSTEM');
        await tx.outboxEvent.update({ where: { id: event.id }, data: { processedAt: new Date() } });
      });
    }
    return { expiredVerifications: expired.length, expiredKyc: expiredKyc.length };
  }

  async processOutboxBatch(limit = 50) {
    const events = await this.prisma.outboxEvent.findMany({ where: { processedAt: null }, orderBy: { createdAt: 'asc' }, take: limit });
    for (const event of events) {
      await this.prisma.$transaction(async (tx) => {
        const locked = await tx.outboxEvent.findUnique({ where: { id: event.id } });
        if (!locked || locked.processedAt) return;
        // State propagation is idempotent; the event is retained as the durable retry record.
        if (event.eventType === 'SAFETY_USER_CHANGED') await this.propagateUser(tx, (event.payload as any).userId, (event.payload as any).reason, (event.payload as any).actorId);
        if (event.eventType === 'SAFETY_PROPERTY_CHANGED') await this.propagateProperty(tx, (event.payload as any).propertyId, (event.payload as any).reason, (event.payload as any).actorId);
        await tx.outboxEvent.update({ where: { id: event.id }, data: { processedAt: new Date() } });
      });
    }
    return { processed: events.length };
  }

  private async transitionUser(userId: string, actorId: string, action: SafetyAction, reason: string) {
    if (!reason?.trim()) throw new BadRequestException('An override reason is required');
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true, status: true } });
    if (!user) throw new NotFoundException('User not found');
    return this.prisma.$transaction(async (tx) => {
      let status: UserStatus = user.status;
      if (action === 'SUSPEND' || action === 'EXPIRE') status = UserStatus.SUSPENDED;
      if (action === 'REINSTATE' || action === 'REVERIFY') status = UserStatus.ACTIVE;
      const updated = await tx.user.update({ where: { id: userId }, data: { status } });
      const event = await tx.outboxEvent.create({ data: { eventType: 'SAFETY_USER_CHANGED', payload: { userId, action, reason: reason.trim(), actorId } } });
      await this.audit.log(tx, { actorId, action: `SAFETY_USER_${action}`, entityType: 'USER', entityId: userId, reason: reason.trim() });
      if (action === 'SUSPEND' || action === 'EXPIRE') await this.propagateUser(tx, userId, reason.trim(), actorId);
      else await this.restoreForReview(tx, userId, reason.trim());
      await tx.outboxEvent.update({ where: { id: event.id }, data: { processedAt: new Date() } });
      return updated;
    });
  }

  private async propagateUser(tx: any, userId: string, reason: string, actorId: string) {
    const properties = await tx.property.findMany({ where: { ownerId: userId }, select: { id: true } });
    for (const property of properties) await this.propagateProperty(tx, property.id, reason, actorId);
    await tx.notification.create({ data: { userId, title: 'Safety status updated', body: `${reason}. Your published listings, contact requests, and payment activity may be paused until review is complete.` } });
  }

  private async propagateProperty(tx: any, propertyId: string, reason: string, actorId: string) {
    const listings = await tx.listing.findMany({ where: { propertyId }, select: { id: true, lifecycleState: true } });
    const listingIds = listings.map((listing: any) => listing.id);
    await tx.property.update({ where: { id: propertyId }, data: { status: 'INACTIVE' } });
    if (listingIds.length) {
      await tx.listing.updateMany({ where: { id: { in: listingIds } }, data: { lifecycleState: reason.includes('expired') ? PublishStatus.EXPIRED : PublishStatus.SUSPENDED } });
      await tx.contactRequest.updateMany({ where: { listingId: { in: listingIds }, status: { in: ['PENDING', 'APPROVED'] } }, data: { status: 'REJECTED' } });
      await tx.paymentOrder.updateMany({ where: { listingId: { in: listingIds }, status: { in: [PaymentStatus.CREATED, PaymentStatus.AUTHORIZED] } }, data: { status: PaymentStatus.DISPUTED } });
      const tenants = await tx.contactRequest.findMany({ where: { listingId: { in: listingIds } }, select: { tenantId: true }, distinct: ['tenantId'] });
      for (const tenant of tenants) await tx.notification.create({ data: { userId: tenant.tenantId, title: 'Listing safety status changed', body: 'A listing you contacted is temporarily unavailable while RentSafe completes a safety review.' } });
    }
  }

  private async restoreForReview(tx: any, userId: string, reason: string) {
    const properties = await tx.property.findMany({ where: { ownerId: userId }, select: { id: true } });
    for (const property of properties) {
      await tx.property.update({ where: { id: property.id }, data: { status: 'ACTIVE' } });
      const listings = await tx.listing.findMany({ where: { propertyId: property.id }, select: { id: true } });
      if (listings.length) await tx.listing.updateMany({ where: { id: { in: listings.map((l: any) => l.id) } }, data: { lifecycleState: PublishStatus.UNDER_REVIEW } });
    }
    await tx.notification.create({ data: { userId, title: 'Re-verification required', body: `${reason}. Your listings are under review and will not be published until safety checks are complete.` } });
  }
}
