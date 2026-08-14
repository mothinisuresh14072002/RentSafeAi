import { Body, Controller, Get, Headers, Param, Post, Query, Request, UseGuards } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { AuditReasonGuard, AuditReasonRequired } from '../common/audit/audit-reason.guard';

@Controller('payments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PaymentController {
  constructor(private readonly payments: PaymentService) {}
  @Get('eligibility') @Roles('TENANT') eligibility(@Request() req: any, @Query() q: any) { return this.payments.eligibilityFor(req.user.userId, q.listingId, q.agreementId, Number(q.amount)); }
  @Post('orders') @Roles('TENANT') create(@Request() req: any, @Headers('idempotency-key') key: string, @Body() body: any) { return this.payments.createOrder(req.user.userId, { ...body, amount: Number(body.amount), idempotencyKey: key || body.idempotencyKey }); }
  @Get('history') @Roles('TENANT') history(@Request() req: any) { return this.payments.history(req.user.userId); }
  @Get('owner/summary') @Roles('OWNER') ownerSummary(@Request() req: any) { return this.payments.ownerSummary(req.user.userId); }
  @Get('admin') @Roles('ADMIN', 'REVIEWER') adminOrders() { return this.payments.adminOrders(); }
  @Post('eligibility-exceptions') @Roles('ADMIN', 'REVIEWER') @UseGuards(AuditReasonGuard) @AuditReasonRequired() exception(@Request() req: any, @Body() body: any) { return this.payments.createViewingException(req.user.userId, body); }
  @Post(':id/refund') @Roles('ADMIN', 'REVIEWER') refund(@Request() req: any, @Param('id') id: string, @Body() body: { reason: string }) { return this.payments.refund(id, req.user.userId, body.reason); }
  @Post(':id/dispute') @Roles('ADMIN', 'REVIEWER') dispute(@Request() req: any, @Param('id') id: string, @Body() body: { reason: string }) { return this.payments.dispute(id, req.user.userId, body.reason); }
  @Get('admin/:id/timeline') @Roles('ADMIN', 'REVIEWER') timeline(@Param('id') id: string) { return this.payments.adminTimeline(id); }
}

/** Provider callbacks are public at the transport layer; the signature is the authentication mechanism. */
@Controller('payments/webhooks')
export class PaymentWebhookController {
  constructor(private readonly payments: PaymentService) {}
  @Post('sandbox') webhook(@Headers('x-provider-signature') signature: string, @Body() body: any) { return this.payments.handleWebhook(signature, body); }
}
