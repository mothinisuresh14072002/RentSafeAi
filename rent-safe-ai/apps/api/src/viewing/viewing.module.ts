import { Module } from '@nestjs/common';
import { ViewingService } from './viewing.service';
import { ViewingController } from './viewing.controller';
import { PrismaModule } from '../common/prisma/prisma.module';
import { AuditModule } from '../common/audit/audit.module';
import { BullModule } from '@nestjs/bullmq';
import { ViewingReminderProcessor } from './viewing-reminder.processor';

@Module({
  imports: [
    PrismaModule,
    AuditModule,
    BullModule.registerQueue({ name: 'viewing-reminders' }),
  ],
  providers: [ViewingService, ViewingReminderProcessor],
  controllers: [ViewingController],
  exports: [ViewingService],
})
export class ViewingModule {}
