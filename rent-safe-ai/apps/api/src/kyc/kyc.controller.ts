import { Controller, Get, Post, Body, UseGuards, Request, Headers, HttpCode, HttpStatus, Param } from '@nestjs/common';
import { KycService } from './kyc.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.guard';
import { AuditReasonGuard } from '../common/audit/audit-reason.guard';
import { AuditReasonRequired } from '../common/audit/audit-reason.guard';

@Controller('kyc')
export class KycController {
  constructor(private readonly kycService: KycService) {}

  @Post('initiate')
  @UseGuards(JwtAuthGuard)
  async initiateKyc(@Request() req, @Body() body: any) {
    return this.kycService.initiateKyc(req.user.userId, body);
  }

  @Get('status')
  @UseGuards(JwtAuthGuard)
  async getStatus(@Request() req) {
    return this.kycService.getKycStatus(req.user.userId);
  }

  // Webhook is public but requires signature
  @Post('webhook/sandbox')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(@Headers('x-sandbox-signature') signature: string, @Body() body: any) {
    return this.kycService.handleWebhook(signature, body);
  }
}

@Controller('reviewer/kyc')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('REVIEWER', 'ADMIN')
export class ReviewerKycController {
  constructor(private readonly kycService: KycService) {}

  @Get('pending')
  async getPending() {
    return this.kycService.getPendingCases();
  }

  @Post(':id/decision')
  @UseGuards(AuditReasonGuard)
  @AuditReasonRequired()
  async submitDecision(@Param('id') id: string, @Request() req, @Body() body: { decision: 'APPROVED' | 'REJECTED' }) {
    return this.kycService.submitReviewerDecision(id, req.user.userId, body.decision, req.auditReason);
  }
}
