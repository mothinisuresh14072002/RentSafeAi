import { Module } from '@nestjs/common';
import { AgreementService } from './agreement.service';
import { AgreementController } from './agreement.controller';
import { PrismaModule } from '../common/prisma/prisma.module';
import { AuditModule } from '../common/audit/audit.module';

@Module({
  imports: [PrismaModule, AuditModule],
  providers: [AgreementService],
  controllers: [AgreementController],
  exports: [AgreementService],
})
export class AgreementModule {}
