import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { PrismaService } from '../common/prisma/prisma.service';
import type {
  EmailAdapter,
  LocalNotificationAdapter,
} from './notification.adapters';
import {
  NotificationChannelName,
  NotificationEvent,
} from './notification.types';

@Processor('notifications')
@Injectable()
export class NotificationsProcessor extends WorkerHost implements OnModuleInit {
  private readonly logger = new Logger(NotificationsProcessor.name);
  constructor(
    private readonly prisma: PrismaService,
    @Inject('EmailAdapter') private readonly email: EmailAdapter,
    @Inject('LocalNotificationAdapter')
    private readonly local: LocalNotificationAdapter,
    @InjectQueue('notifications') private readonly queue: Queue,
  ) {
    super();
  }
  async onModuleInit() {
    await this.queue.add('outbox-dispatch', {}, {
      repeat: { every: 2000 },
      jobId: 'notifications-outbox-dispatch',
      attempts: 5,
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: 100,
      removeOnFail: 1000,
    } as any);
  }

  async process(job: Job<{ event?: NotificationEvent }>) {
    const started = Date.now();
    try {
      if (job.name === 'outbox-dispatch') return this.dispatch(50);
      if (job.name === 'deliver' && job.data.event)
        return this.deliver(job.data.event);
    } catch (error) {
      this.logger.error(
        `job=${job.name} id=${job.id} attempt=${job.attemptsMade + 1} durationMs=${Date.now() - started}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  async dispatch(limit = 50) {
    const events = await this.prisma.outboxEvent.findMany({
      where: {
        eventType: 'NOTIFICATION_REQUESTED',
        processedAt: null,
        deadLetteredAt: null,
        nextAttemptAt: { lte: new Date() },
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
    let processed = 0;
    for (const event of events) {
      const claimed = await this.prisma.outboxEvent.updateMany({
        where: { id: event.id, processedAt: null, deadLetteredAt: null },
        data: { lockedAt: new Date(), attempts: { increment: 1 } },
      });
      if (!claimed.count) continue;
      try {
        await this.queue.add(
          'deliver',
          { event: event.payload as unknown as NotificationEvent },
          {
            jobId: `notification-outbox-${event.id}`,
            attempts: 5,
            backoff: { type: 'exponential', delay: 1000 },
            removeOnComplete: 100,
            removeOnFail: 1000,
          },
        );
        await this.prisma.outboxEvent.update({
          where: { id: event.id },
          data: { processedAt: new Date(), lockedAt: null },
        });
        processed++;
      } catch (error) {
        const attempts = event.attempts + 1;
        await this.prisma.outboxEvent.update({
          where: { id: event.id },
          data:
            attempts >= 10
              ? {
                  deadLetteredAt: new Date(),
                  lastError: String(error),
                  lockedAt: null,
                }
              : {
                  nextAttemptAt: new Date(
                    Date.now() + Math.min(300000, 1000 * 2 ** attempts),
                  ),
                  lastError: String(error),
                  lockedAt: null,
                },
        });
      }
    }
    this.logger.log(
      `job=outbox-dispatch scanned=${events.length} processed=${processed}`,
    );
    return { scanned: events.length, processed };
  }

  private async deliver(event: NotificationEvent) {
    const prefs = await this.prisma.notificationPreference.findUnique({
      where: { userId: event.userId },
    });
    const user = await this.prisma.user.findUnique({
      where: { id: event.userId },
      select: { email: true },
    });
    const channels: NotificationChannelName[] = event.channels || [
      'IN_APP',
      'EMAIL',
    ];
    const inApp = channels.includes('IN_APP');
    if (inApp) {
      await this.prisma.notification.upsert({
        where: {
          userId_deduplicationKey: {
            userId: event.userId,
            deduplicationKey: event.deduplicationKey,
          },
        },
        create: {
          userId: event.userId,
          title: event.title,
          body: event.body,
          eventType: event.eventType,
          deduplicationKey: event.deduplicationKey,
          channel: 'IN_APP',
          deliveryStatus: 'SENT',
          deliveredAt: new Date(),
        },
        update: {},
      });
      await this.local.send(event.userId, event.title, event.body);
    }
    if (
      channels.includes('EMAIL') &&
      (prefs?.emailEnabled ?? true) &&
      user?.email
    )
      await this.email.send(user.email, event.title, event.body);
    return { userId: event.userId, eventType: event.eventType };
  }
}
