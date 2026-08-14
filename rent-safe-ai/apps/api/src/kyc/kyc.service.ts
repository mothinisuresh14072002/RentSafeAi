import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { SandboxKycProvider } from './providers/sandbox.provider';
import { VerificationStatus, OwnerState } from '@prisma/client';
import { OwnerProfileService } from '../owner-profile/owner-profile.service';
import { RedactionUtil } from '../common/utils/redaction.util';
import { AuditService } from '../common/audit/audit.service';

@Injectable()
export class KycService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly provider: SandboxKycProvider,
    private readonly profileService: OwnerProfileService,
    private readonly auditService: AuditService,
  ) {}

  async initiateKyc(userId: string, inputData: any) {
    const profile = await this.prisma.userProfile.findUnique({
      where: { userId },
    });

    if (!profile || profile.ownerState !== OwnerState.KYC_PENDING) {
      throw new BadRequestException('Owner must be in KYC_PENDING state to initiate verification.');
    }

    const providerReference = await this.provider.initiateVerification(userId, inputData);

    return this.prisma.ownerKycCase.create({
      data: {
        userId,
        provider: 'SANDBOX',
        providerReference,
        status: VerificationStatus.PENDING,
      },
    });
  }

  async handleWebhook(signature: string, payload: any) {
    if (!this.provider.verifyCallbackSignature(signature, payload)) {
      throw new BadRequestException('Invalid webhook signature');
    }

    const { reference, status, data } = payload;

    return this.prisma.$transaction(async (tx) => {
      const kycCase = await tx.ownerKycCase.findUnique({
        where: { providerReference: reference },
        include: { user: { include: { profile: true } } },
      });

      if (!kycCase) {
        throw new BadRequestException('KYC case not found');
      }

      // Idempotency check: Ignore if already resolved
      if (kycCase.status !== VerificationStatus.PENDING) {
        return { message: 'Webhook already processed' };
      }

      const maskedData = {
        name: data?.name,
        dob: data?.dob,
        aadhaar: RedactionUtil.maskAadhaar(data?.rawAadhaar) || '***',
      };

      let newStatus = VerificationStatus.VERIFIED;
      let newOwnerState = OwnerState.VERIFIED;
      let reviewerDecision = null;

      if (status === 'FAILED') {
        newStatus = VerificationStatus.REJECTED;
        newOwnerState = OwnerState.REJECTED;
        reviewerDecision = 'FAILED_BY_PROVIDER';
      } else if (data?.name && data.name.includes('Mismatch')) {
        newStatus = VerificationStatus.NEEDS_REVIEW;
        newOwnerState = OwnerState.KYC_REVIEW;
        reviewerDecision = 'NAME_MISMATCH';
      }

      await tx.ownerKycCase.update({
        where: { id: kycCase.id },
        data: {
          status: newStatus,
          maskedResult: maskedData as any,
          normalizedName: data?.name,
          reviewerDecision,
        },
      });

      // Transition Owner State
      // Note: we can invoke the profile service directly but it expects its own transaction.
      // So we will just do it directly or allow the service method to take a tx.
      // We will perform it manually here to remain inside atomic block.
      await tx.userProfile.update({
        where: { userId: kycCase.userId },
        data: { ownerState: newOwnerState },
      });

      // Log the transition
      const actionReason = `KYC Webhook updated state to ${newOwnerState}`;
      await this.auditService.log(tx, {
        actorId: 'SYSTEM',
        action: `OWNER_STATE_${newOwnerState}`,
        entityType: 'USER_PROFILE',
        entityId: kycCase.userId,
        reason: actionReason,
      });

      return { success: true };
    });
  }

  async getKycStatus(userId: string) {
    return this.prisma.ownerKycCase.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        status: true,
        reviewerDecision: true,
        createdAt: true,
      },
    });
  }

  async getPendingCases() {
    return this.prisma.ownerKycCase.findMany({
      where: { status: VerificationStatus.NEEDS_REVIEW },
      include: {
        user: { select: { email: true, phone: true } },
      },
    });
  }

  async submitReviewerDecision(caseId: string, reviewerId: string, decision: 'APPROVED' | 'REJECTED', reason: string) {
    return this.prisma.$transaction(async (tx) => {
      const kycCase = await tx.ownerKycCase.findUnique({ where: { id: caseId } });
      if (!kycCase || kycCase.status !== VerificationStatus.NEEDS_REVIEW) {
        throw new BadRequestException('Case not available for review');
      }

      const newStatus = decision === 'APPROVED' ? VerificationStatus.VERIFIED : VerificationStatus.REJECTED;
      const newOwnerState = decision === 'APPROVED' ? OwnerState.VERIFIED : OwnerState.REJECTED;

      await tx.ownerKycCase.update({
        where: { id: caseId },
        data: {
          status: newStatus,
          reviewerDecision: `MANUAL_${decision}`,
          reviewedAt: new Date(),
        },
      });

      await tx.userProfile.update({
        where: { userId: kycCase.userId },
        data: { ownerState: newOwnerState },
      });

      await this.auditService.log(tx, {
        actorId: reviewerId,
        action: `OWNER_STATE_${newOwnerState}`,
        entityType: 'USER_PROFILE',
        entityId: kycCase.userId,
        reason,
      });

      return { success: true, status: newStatus };
    });
  }
}
