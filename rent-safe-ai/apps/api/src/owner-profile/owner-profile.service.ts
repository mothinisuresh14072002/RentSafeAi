import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { OwnerState, Role } from '@prisma/client';

export interface UpsertProfileDto {
  firstName: string;
  lastName: string;
  displayName?: string;
}

@Injectable()
export class OwnerProfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async upsertProfile(userId: string, dto: UpsertProfileDto) {
    return this.prisma.$transaction(async (tx) => {
      let profile = await tx.userProfile.findUnique({ where: { userId } });
      
      if (profile) {
        profile = await tx.userProfile.update({
          where: { userId },
          data: dto,
        });
      } else {
        profile = await tx.userProfile.create({
          data: {
            userId,
            ...dto,
            ownerState: OwnerState.PROFILE_PENDING,
          },
        });
      }

      // Upgrade role to OWNER if not already
      const user = await tx.user.findUnique({ where: { id: userId } });
      if (user && user.role === Role.TENANT) {
        await tx.user.update({
          where: { id: userId },
          data: { role: Role.OWNER },
        });
      }

      // If they drafted a profile and phone/email is verified, we can move them to KYC_PENDING
      if (profile.ownerState === OwnerState.PROFILE_PENDING && user?.isPhoneVerified) {
        profile = await tx.userProfile.update({
          where: { userId },
          data: { ownerState: OwnerState.KYC_PENDING },
        });
      }

      return profile;
    });
  }

  async getChecklist(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true, ownerKycCases: true },
    });

    if (!user) throw new BadRequestException('User not found');

    const hasProfile = !!user.profile;
    const isPhoneVerified = user.isPhoneVerified;
    const isEmailVerified = user.isEmailVerified;
    const ownerState = user.profile?.ownerState || OwnerState.PROFILE_PENDING;

    return {
      hasProfile,
      isPhoneVerified,
      isEmailVerified,
      ownerState,
      canSubmitProperty: ownerState === OwnerState.VERIFIED,
    };
  }

  async transitionState(userId: string, toState: OwnerState, reason?: string, actorId?: string) {
    return this.prisma.$transaction(async (tx) => {
      const profile = await tx.userProfile.findUnique({ where: { userId } });
      if (!profile) throw new BadRequestException('Profile not found');

      const restrictedStates = [
        OwnerState.REJECTED,
        OwnerState.SUSPENDED,
        OwnerState.EXPIRED,
        OwnerState.CHANGES_REQUESTED,
      ];

      // Use the provided actorId, or default to SYSTEM if it's an automated transition
      const actualActor = actorId || 'SYSTEM';

      if ((restrictedStates as string[]).includes(toState)) {
        if (!reason) throw new BadRequestException(`Transition to ${toState} requires a reason.`);
        
        await this.auditService.log(tx, {
          actorId: actualActor,
          action: `OWNER_STATE_${toState}`,
          entityType: 'USER_PROFILE',
          entityId: userId,
          reason,
        });
      } else {
        await this.auditService.log(tx, {
          actorId: actualActor,
          action: `OWNER_STATE_${toState}`,
          entityType: 'USER_PROFILE',
          entityId: userId,
          reason: reason || `Transitioned to ${toState}`,
        });
      }

      return tx.userProfile.update({
        where: { userId },
        data: { ownerState: toState },
      });
    });
  }
}
