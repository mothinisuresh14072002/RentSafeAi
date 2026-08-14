import { Global, Module } from '@nestjs/common';
import { AuditService } from './audit.service';
import { AuditReasonGuard } from './audit-reason.guard';

@Global()
@Module({
  providers: [AuditService, AuditReasonGuard],
  exports: [AuditService, AuditReasonGuard],
})
export class AuditModule {}
