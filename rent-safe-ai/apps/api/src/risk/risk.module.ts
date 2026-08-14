import { Module } from '@nestjs/common';
import { RiskService } from './risk.service';
import { RiskController } from './risk.controller';
import { RuleRegistry } from './rule-registry';
import { PrismaModule } from '../common/prisma/prisma.module';
import { BullModule } from '@nestjs/bullmq';
import { RiskEvaluationProcessor } from './risk-evaluation.processor';

@Module({
  imports: [
    PrismaModule,
    BullModule.registerQueue({ name: 'risk-evaluation' }),
  ],
  providers: [RiskService, RuleRegistry, RiskEvaluationProcessor],
  controllers: [RiskController],
  exports: [RiskService],
})
export class RiskModule {}
