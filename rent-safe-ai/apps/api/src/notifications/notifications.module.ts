import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '../common/prisma/prisma.module';
import { NotificationsService } from './notifications.service';
import { NotificationsProcessor } from './notifications.processor';
import {
  LoggingEmailAdapter,
  LocalNotificationAdapterImpl,
} from './notification.adapters';
import { NotificationsController } from './notifications.controller';

@Module({
  imports: [PrismaModule, BullModule.registerQueue({ name: 'notifications' })],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationsProcessor,
    { provide: 'EMAIL_ADAPTER', useClass: LoggingEmailAdapter },
    {
      provide: 'LOCAL_NOTIFICATION_ADAPTER',
      useClass: LocalNotificationAdapterImpl,
    },
    { provide: 'EmailAdapter', useExisting: 'EMAIL_ADAPTER' },
    {
      provide: 'LocalNotificationAdapter',
      useExisting: 'LOCAL_NOTIFICATION_ADAPTER',
    },
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
