import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ViewingStatus } from '@prisma/client';

@Injectable()
export class ViewingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    @InjectQueue('viewing-reminders') private readonly reminderQueue: Queue,
  ) {}

  async proposeViewing(
    tenantId: string,
    listingId: string,
    schedule: Date,
    reason: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const listing = await tx.listing.findUnique({
        where: { id: listingId },
        include: { property: true },
      });
      if (!listing) throw new NotFoundException('Listing not found');
      if (listing.property.ownerId === tenantId) {
        throw new BadRequestException(
          'Owner cannot request a viewing of their own property',
        );
      }

      const viewing = await tx.viewingRequest.create({
        data: {
          tenantId,
          listingId,
          schedule,
          status: ViewingStatus.PROPOSED,
        },
      });

      // Schedule a BullMQ reminder 24h before the viewing
      const delay = Math.max(0, schedule.getTime() - Date.now() - 86400000);
      await this.reminderQueue.add(
        'reminder',
        { viewingId: viewing.id },
        {
          delay,
          jobId: `viewing-reminder-${viewing.id}`,
          attempts: 5,
          backoff: { type: 'exponential', delay: 1000 },
          removeOnComplete: 100,
          removeOnFail: 1000,
        },
      );

      await this.audit.log(tx, {
        actorId: tenantId,
        action: 'VIEWING_PROPOSED',
        entityType: 'ViewingRequest',
        entityId: viewing.id,
        reason,
      });
      return viewing;
    });
  }

  async acceptViewing(userId: string, viewingId: string, reason: string) {
    return this._transition(
      userId,
      viewingId,
      ViewingStatus.ACCEPTED,
      'VIEWING_ACCEPTED',
      reason,
    );
  }

  async rescheduleViewing(
    userId: string,
    viewingId: string,
    newSchedule: Date,
    reason: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      await this._getAndAuthorize(tx, userId, viewingId);

      const updated = await tx.viewingRequest.update({
        where: { id: viewingId },
        data: { schedule: newSchedule, status: ViewingStatus.RESCHEDULED },
      });

      await this.audit.log(tx, {
        actorId: userId,
        action: 'VIEWING_RESCHEDULED',
        entityType: 'ViewingRequest',
        entityId: viewingId,
        reason,
      });
      return updated;
    });
  }

  async cancelViewing(userId: string, viewingId: string, reason: string) {
    return this._transition(
      userId,
      viewingId,
      ViewingStatus.CANCELLED,
      'VIEWING_CANCELLED',
      reason,
    );
  }

  async confirmViewing(
    userId: string,
    viewingId: string,
    role: 'tenant' | 'owner',
    reason: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const viewing = await tx.viewingRequest.findUnique({
        where: { id: viewingId },
        include: { listing: { include: { property: true } } },
      });
      if (!viewing) throw new NotFoundException('Viewing not found');

      const now = new Date();
      const update: { tenantConfirmedAt?: Date; ownerConfirmedAt?: Date } = {};
      if (role === 'tenant' && viewing.tenantId === userId) {
        update.tenantConfirmedAt = now;
      } else if (
        role === 'owner' &&
        viewing.listing.property.ownerId === userId
      ) {
        update.ownerConfirmedAt = now;
      } else {
        throw new ForbiddenException('Not a participant');
      }

      let updated = await tx.viewingRequest.update({
        where: { id: viewingId },
        data: update,
      });

      // If both confirmed, mark COMPLETED
      if (updated.tenantConfirmedAt && updated.ownerConfirmedAt) {
        updated = await tx.viewingRequest.update({
          where: { id: viewingId },
          data: { status: ViewingStatus.COMPLETED },
        });
      }

      await this.audit.log(tx, {
        actorId: userId,
        action: 'VIEWING_CONFIRMED',
        entityType: 'ViewingRequest',
        entityId: viewingId,
        reason,
      });
      return updated;
    });
  }

  private async _transition(
    userId: string,
    viewingId: string,
    newStatus: ViewingStatus,
    actionCode: string,
    reason: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      await this._getAndAuthorize(tx, userId, viewingId);

      const updated = await tx.viewingRequest.update({
        where: { id: viewingId },
        data: { status: newStatus },
      });

      await this.audit.log(tx, {
        actorId: userId,
        action: actionCode,
        entityType: 'ViewingRequest',
        entityId: viewingId,
        reason,
      });
      return updated;
    });
  }

  private async _getAndAuthorize(tx: any, userId: string, viewingId: string) {
    const viewing = await tx.viewingRequest.findUnique({
      where: { id: viewingId },
      include: { listing: { include: { property: true } } },
    });
    if (!viewing) throw new NotFoundException('Viewing not found');

    const isParticipant =
      viewing.tenantId === userId ||
      viewing.listing.property.ownerId === userId;
    if (!isParticipant) throw new ForbiddenException('Not a participant');
    return viewing;
  }
}
