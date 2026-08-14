import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import {
  PrivacyRequestType,
  PrivacyRequestStatus,
  UserStatus,
} from '@prisma/client';

@Injectable()
export class PrivacyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async requestDataExport(userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const request = await tx.privacyRequest.create({
        data: {
          userId,
          type: PrivacyRequestType.EXPORT,
          status: PrivacyRequestStatus.PENDING,
        },
      });

      await this.auditService.log(tx, {
        actorId: userId,
        action: 'DATA_EXPORT_REQUESTED',
        entityType: 'PRIVACY_REQUEST',
        entityId: request.id,
        reason: 'User requested data export via privacy portal',
      });

      return request;
    });
  }

  async requestDataDeletion(userId: string) {
    return this.prisma.$transaction(async (tx) => {
      // Create deletion request
      const request = await tx.privacyRequest.create({
        data: {
          userId,
          type: PrivacyRequestType.DELETION,
          status: PrivacyRequestStatus.PENDING,
        },
      });

      // Mark user for deletion safely
      await tx.user.update({
        where: { id: userId },
        data: { status: UserStatus.PENDING_DELETION },
      });

      // Revoke active sessions
      await tx.session.updateMany({
        where: { userId, status: 'ACTIVE' },
        data: { status: 'REVOKED' },
      });

      await this.auditService.log(tx, {
        actorId: userId,
        action: 'DATA_DELETION_REQUESTED',
        entityType: 'PRIVACY_REQUEST',
        entityId: request.id,
      });

      return request;
    });
  }
}
