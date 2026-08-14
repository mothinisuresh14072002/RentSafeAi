import { Body, Controller, Get, Param, Post, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { FraudReportsService } from './fraud-reports.service';
import type { CreateFraudReportDto } from './fraud-reports.service';
import { ReportStatus } from '@prisma/client';

@Controller('fraud-reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FraudReportsController {
  constructor(private readonly service: FraudReportsService) {}

  @Post()
  @Roles('TENANT')
  create(@Request() req: any, @Body() dto: CreateFraudReportDto) { return this.service.create(req.user.userId, dto); }

  @Get('mine')
  @Roles('TENANT')
  mine(@Request() req: any) { return this.service.mine(req.user.userId); }

  @Get('queue')
  @Roles('REVIEWER', 'ADMIN')
  queue(@Query('status') status?: ReportStatus) { return this.service.queue(status); }

  @Post(':id/actions')
  @Roles('REVIEWER', 'ADMIN')
  decide(@Request() req: any, @Param('id') id: string, @Body() body: { action: 'ASSIGN' | 'INVESTIGATE' | 'RESOLVE' | 'DISMISS' | 'RELEASE_HOLD'; resolution?: string }) { return this.service.decide(id, req.user.userId, body.action, body.resolution); }
}
