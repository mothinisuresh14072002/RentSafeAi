import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { SafetyController } from './safety.controller';
import { SafetyService } from './safety.service';
import { SafetyLifecycleProcessor } from './safety-lifecycle.processor';

@Module({
  imports: [BullModule.registerQueue({ name: 'safety-lifecycle' })],
  controllers: [SafetyController],
  providers: [SafetyService, SafetyLifecycleProcessor],
  exports: [SafetyService],
})
export class SafetyModule {}
