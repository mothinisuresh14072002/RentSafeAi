import { Module } from '@nestjs/common';
import { ViewingService } from './viewing.service';
import { ViewingController } from './viewing.controller';
import { PrismaModule } from '../common/prisma/prisma.module';
import { AuditModule } from '../common/audit/audit.module';
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [
    PrismaModule,
    AuditModule,
    BullModule.registerQueue({ name: 'viewing-reminders' }),
  ],
  providers: [ViewingService],
  controllers: [ViewingController],
  exports: [ViewingService],
})
export class ViewingModule {}
