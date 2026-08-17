import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../../auth/roles.guard';
import { PrismaService } from '../prisma/prisma.service';

@Controller('audit')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('REVIEWER', 'ADMIN')
export class AuditController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('logs')
  async getLogs(
    @Query('action') action?: string,
    @Query('entityType') entityType?: string,
    @Query('actorRole') actorRole?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 20,
  ) {
    const pageNum = Math.max(1, Number(page));
    const pageSizeNum = Math.min(100, Math.max(1, Number(pageSize)));
    const skip = (pageNum - 1) * pageSizeNum;

    const where: any = {};
    if (action) where.action = action;
    if (entityType) where.entityType = entityType;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        select: {
          id: true,
          actorId: true,
          action: true,
          entityType: true,
          entityId: true,
          reason: true,
          requestId: true,
          createdAt: true,
          // Exclude ipDeviceReference from response for privacy
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSizeNum,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data,
      total,
      page: pageNum,
      pageSize: pageSizeNum,
      totalPages: Math.ceil(total / pageSizeNum),
    };
  }
}
