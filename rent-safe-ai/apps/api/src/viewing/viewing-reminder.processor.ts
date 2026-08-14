import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../common/prisma/prisma.service';

@Processor('viewing-reminders')
@Injectable()
export class ViewingReminderProcessor extends WorkerHost {
  constructor(private readonly prisma: PrismaService) {
    super();
  }
  async process(job: Job<{ viewingId: string }>) {
    const viewing = await this.prisma.viewingRequest.findUnique({
      where: { id: job.data.viewingId },
      include: { listing: { include: { property: true } } },
    });
    if (!viewing || ['CANCELLED', 'COMPLETED'].includes(viewing.status))
      return { skipped: true };
    const body = `Reminder: your viewing is scheduled for ${viewing.schedule.toISOString()}.`;
    await this.prisma.$transaction(async (tx) => {
      for (const userId of [viewing.tenantId, viewing.listing.property.ownerId])
        await tx.outboxEvent.create({
          data: {
            eventType: 'NOTIFICATION_REQUESTED',
            payload: {
              userId,
              title: 'Viewing reminder',
              body,
              eventType: 'VIEWING_REMINDER',
              deduplicationKey: `viewing:${viewing.id}:reminder`,
              channels: ['IN_APP', 'EMAIL'],
            } as any,
          },
        });
    });
    return { skipped: false, viewingId: viewing.id };
  }
}
