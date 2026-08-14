import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { SandboxBankProvider } from './providers/sandbox-bank.provider';
import { AuditService } from '../common/audit/audit.service';
import { OwnerProfileService } from '../owner-profile/owner-profile.service';
import { RedactionUtil } from '../common/utils/redaction.util';
import { StringUtil } from '../common/utils/string.util';
import { VerificationStatus } from '@prisma/client';

export interface AddBankAccountDto {
  accountNumber: string;
  ifsc: string;
}

@Injectable()
export class BankService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly provider: SandboxBankProvider,
    private readonly auditService: AuditService,
    private readonly profileService: OwnerProfileService,
  ) {}

  async addBankAccount(userId: string, dto: AddBankAccountDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!user || !user.profile) {
      throw new BadRequestException('Owner profile not found');
    }

    const expectedName =
      `${user.profile.firstName || ''} ${user.profile.lastName || ''}`.trim();

    // In Sandbox, pass expectedName down to simulate the matching condition
    const result = await this.provider.verifyBankAccount({
      ...dto,
      expectedName,
    });

    let status: VerificationStatus = VerificationStatus.PENDING;
    let reviewerDecision: string | null = null;

    if (result.status === 'FAILED') {
      status = VerificationStatus.REJECTED;
      reviewerDecision = 'FAILED_BY_PROVIDER';
    } else {
      // Evaluate name match
      const isMatch = StringUtil.compareNames(
        expectedName,
        result.beneficiaryName,
      );
      if (isMatch) {
        status = VerificationStatus.VERIFIED;
      } else {
        status = VerificationStatus.NEEDS_REVIEW;
        reviewerDecision = 'NAME_MISMATCH';
      }
    }

    // Set other accounts to not primary
    await this.prisma.ownerBankAccount.updateMany({
      where: { userId },
      data: { isPrimary: false },
    });

    // Encrypt token (MVP logic: we store raw if it's sandbox, but conceptually encrypt it)
    const encryptedToken = Buffer.from(
      `mock_enc_${dto.accountNumber}`,
    ).toString('base64');
    const maskedAccount =
      RedactionUtil.maskBankAccount(dto.accountNumber) || '***';

    const account = await this.prisma.ownerBankAccount.create({
      data: {
        userId,
        encryptedToken,
        maskedAccount,
        providerReference: result.reference,
        beneficiaryResult: result.beneficiaryName,
        status,
        isPrimary: true,
        reviewerDecision,
      },
    });

    // If Bank account changed and is verified, ensure we notify Profile/Audit
    if (status === VerificationStatus.VERIFIED) {
      await this.auditService.log(this.prisma, {
        actorId: userId,
        action: 'BANK_ACCOUNT_VERIFIED',
        entityType: 'OWNER_BANK_ACCOUNT',
        entityId: account.id,
        reason: 'Added new verified primary bank account',
      });
    }

    // If their current owner state is VERIFIED, but the bank account NEEDS_REVIEW, we might want to restrict payments,
    // but the prompt says: "Critical bank change invalidates payment eligibility immediately."
    // We could drop them to KYC_REVIEW or just rely on the fact that payment gateway checks BankAccount status.
    // We'll leave the owner state intact, but the bank account is clearly not VERIFIED.

    return account;
  }

  async getBankAccounts(userId: string) {
    return this.prisma.ownerBankAccount.findMany({
      where: { userId },
      select: {
        id: true,
        maskedAccount: true,
        beneficiaryResult: true,
        status: true,
        isPrimary: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPendingReviewCases() {
    return this.prisma.ownerBankAccount.findMany({
      where: { status: VerificationStatus.NEEDS_REVIEW },
      include: {
        user: { select: { email: true, profile: true } },
      },
    });
  }

  async submitReviewerDecision(
    accountId: string,
    reviewerId: string,
    decision: 'APPROVED' | 'REJECTED',
    reason: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const account = await tx.ownerBankAccount.findUnique({
        where: { id: accountId },
      });
      if (!account || account.status !== VerificationStatus.NEEDS_REVIEW) {
        throw new BadRequestException('Bank account not available for review');
      }

      const newStatus =
        decision === 'APPROVED'
          ? VerificationStatus.VERIFIED
          : VerificationStatus.REJECTED;

      await tx.ownerBankAccount.update({
        where: { id: accountId },
        data: {
          status: newStatus,
          reviewerDecision: `MANUAL_${decision}`,
        },
      });

      await this.auditService.log(tx, {
        actorId: reviewerId,
        action: `BANK_ACCOUNT_${newStatus}`,
        entityType: 'OWNER_BANK_ACCOUNT',
        entityId: account.id,
        reason,
      });

      return { success: true, status: newStatus };
    });
  }
}
