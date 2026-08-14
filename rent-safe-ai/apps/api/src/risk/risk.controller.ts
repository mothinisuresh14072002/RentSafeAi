import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { RiskService } from './risk.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('risk')
@UseGuards(JwtAuthGuard)
export class RiskController {
  constructor(private readonly riskService: RiskService) {}

  /** Admin: view all registered rules with version and severity */
  @Get('rules')
  getRules() {
    return this.riskService.getRuleRegistry();
  }

  /** Admin: get all active risk signals for a given entity */
  @Get('signals/:entityType/:entityId')
  getSignals(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
  ) {
    return this.riskService.getActiveSignals(entityType, entityId);
  }

  /** Admin: resolve a risk signal with an explanation */
  @Post('signals/:signalId/resolve')
  resolve(
    @Request() req: any,
    @Param('signalId') signalId: string,
    @Body('resolution') resolution: string,
  ) {
    return this.riskService.resolveSignal(signalId, req.user.userId, resolution);
  }

  /** Admin: trigger a re-evaluation for an entity */
  @Post('evaluate/:entityType/:entityId')
  evaluate(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
  ) {
    return this.riskService.enqueueEvaluation(entityType, entityId);
  }
}
