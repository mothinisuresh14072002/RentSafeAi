import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditDto {
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  reason?: string;
  beforeHash?: string;
  afterHash?: string;
  requestId?: string;
  ipDeviceReference?: string;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(tx: any, dto: AuditDto) {
    // Determine if reason is mandatory based on action
    const requiresReason = this.actionRequiresReason(dto.action);
    if (requiresReason && !dto.reason) {
      throw new BadRequestException(`A valid reason is required for action: ${dto.action}`);
    }

    return tx.auditLog.create({
      data: dto,
    });
  }

  private actionRequiresReason(action: string): boolean {
    const sensitiveActions = [
      'USER_SUSPENDED',
      'LISTING_REJECTED',
      'PROPERTY_VERIFICATION_OVERRIDE',
      'PAYMENT_REFUND_MANUAL',
      'DATA_EXPORT_REQUESTED',
    ];
    return sensitiveActions.includes(action);
  }
}
