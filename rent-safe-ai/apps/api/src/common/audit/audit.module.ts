import { Global, Module } from '@nestjs/common';
import { AuditService } from './audit.service';
import { AuditReasonGuard } from './audit-reason.guard';
import { AuditController } from './audit.controller';

@Global()
@Module({
  controllers: [AuditController],
  providers: [AuditService, AuditReasonGuard],
  exports: [AuditService, AuditReasonGuard],
})
export class AuditModule {}
