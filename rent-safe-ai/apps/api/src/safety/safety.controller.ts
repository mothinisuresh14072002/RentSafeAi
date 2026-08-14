import {
  Body,
  Controller,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { SafetyAction, SafetyService } from './safety.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';
import {
  AuditReasonGuard,
  AuditReasonRequired,
} from '../common/audit/audit-reason.guard';

@Controller('safety')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('REVIEWER', 'ADMIN')
export class SafetyController {
  constructor(private readonly safety: SafetyService) {}

  @Post('users/:id/override')
  @UseGuards(AuditReasonGuard)
  @AuditReasonRequired()
  override(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { action: SafetyAction },
  ) {
    return this.safety.overrideUser(
      id,
      req.user.userId,
      body.action,
      req.auditReason,
    );
  }
}
