import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
  Param,
} from '@nestjs/common';
import { BankService } from './bank.service';
import type { AddBankAccountDto } from './bank.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';
import {
  AuditReasonGuard,
  AuditReasonRequired,
} from '../common/audit/audit-reason.guard';

@Controller('bank')
@UseGuards(JwtAuthGuard)
export class BankController {
  constructor(private readonly bankService: BankService) {}

  @Post()
  async addBankAccount(@Request() req, @Body() dto: AddBankAccountDto) {
    return this.bankService.addBankAccount(req.user.userId, dto);
  }

  @Get()
  async getBankAccounts(@Request() req) {
    return this.bankService.getBankAccounts(req.user.userId);
  }
}

@Controller('reviewer/bank')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('REVIEWER', 'ADMIN')
export class ReviewerBankController {
  constructor(private readonly bankService: BankService) {}

  @Get('pending')
  async getPending() {
    return this.bankService.getPendingReviewCases();
  }

  @Post(':id/decision')
  @UseGuards(AuditReasonGuard)
  @AuditReasonRequired()
  async submitDecision(
    @Param('id') id: string,
    @Request() req,
    @Body() body: { decision: 'APPROVED' | 'REJECTED' },
  ) {
    return this.bankService.submitReviewerDecision(
      id,
      req.user.userId,
      body.decision,
      req.auditReason,
    );
  }
}
