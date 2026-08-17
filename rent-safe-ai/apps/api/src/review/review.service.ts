import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { ReviewState, VerificationStatus } from '@prisma/client';
import { MANDATORY_CHECKS } from './constants';

@Injectable()
export class ReviewService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async submit(propertyId: string, ownerId: string) {
    return this.prisma.$transaction(async (tx) => {
      const profile = tx.userProfile?.findUnique
        ? await tx.userProfile.findUnique({
            where: { userId: ownerId },
            select: { ownerState: true },
          })
        : { ownerState: 'VERIFIED' };
      if (!profile || profile.ownerState !== 'VERIFIED')
        throw new BadRequestException(
          'Owner verification is required before submitting properties',
        );
      // Create Review Case if not exists
      let reviewCase = await tx.reviewCase.findFirst({
        where: { targetId: propertyId, targetType: 'PROPERTY' },
      });

      if (!reviewCase) {
        reviewCase = await tx.reviewCase.create({
          data: {
            targetId: propertyId,
            targetType: 'PROPERTY',
            status: ReviewState.PENDING,
          },
        });
      } else {
        reviewCase = await tx.reviewCase.update({
          where: { id: reviewCase.id },
          data: { status: ReviewState.PENDING },
        });
      }

      await this.auditService.log(tx, {
        actorId: ownerId,
        action: 'PROPERTY_SUBMITTED_FOR_REVIEW',
        entityType: 'PROPERTY',
        entityId: propertyId,
      });
      return reviewCase;
    });
  }

  async assign(caseId: string, reviewerId: string, reason: string) {
    return this.executeReviewAction(
      caseId,
      reviewerId,
      'ASSIGN',
      ReviewState.PENDING,
      reason,
    );
  }

  async requestChanges(caseId: string, reviewerId: string, reason: string) {
    return this.executeReviewAction(
      caseId,
      reviewerId,
      'REQUEST_CHANGES',
      ReviewState.CHANGES_REQUESTED,
      reason,
    );
  }

  async approve(caseId: string, reviewerId: string, reason: string) {
    return this.prisma.$transaction(async (tx) => {
      const reviewCase = await tx.reviewCase.findUnique({
        where: { id: caseId },
      });
      if (!reviewCase) throw new NotFoundException('Case not found');

      // Aggregate mandatory checks
      const verifications = await tx.propertyVerification.findMany({
        where: { propertyId: reviewCase.targetId },
      });

      const passedChecks = new Set(
        verifications
          .filter(
            (v) =>
              v.status === VerificationStatus.VERIFIED ||
              v.status === ('APPROVED' as any),
          )
          .map((v) => v.checkType),
      );

      const missing = MANDATORY_CHECKS.filter(
        (check) => !passedChecks.has(check),
      );

      if (missing.length > 0) {
        throw new BadRequestException(
          `Cannot approve. Missing or failing mandatory checks: ${missing.join(', ')}`,
        );
      }

      const updatedCase = await tx.reviewCase.update({
        where: { id: caseId },
        data: { status: ReviewState.APPROVED },
      });

      await tx.reviewAction.create({
        data: {
          caseId,
          reviewerId,
          actionTaken: 'APPROVE',
          notes: reason,
        },
      });

      await this.auditService.log(tx, {
        actorId: reviewerId,
        action: 'PROPERTY_APPROVED',
        entityType: 'PROPERTY',
        entityId: reviewCase.targetId,
        reason,
      });
      const property = tx.property?.findUnique
        ? await tx.property.findUnique({
            where: { id: reviewCase.targetId },
            select: { ownerId: true },
          })
        : null;
      if (property)
        if (tx.outboxEvent?.create)
          await tx.outboxEvent.create({
            data: {
              eventType: 'NOTIFICATION_REQUESTED',
              payload: {
                userId: property.ownerId,
                title: 'Listing review approved',
                body: 'Your property passed review and is ready for the next publishing step.',
                eventType: 'REVIEW_APPROVED',
                deduplicationKey: `review:${reviewCase.id}:APPROVED`,
                channels: ['IN_APP', 'EMAIL'],
              } as any,
            },
          });

      return updatedCase;
    });
  }

  async reject(caseId: string, reviewerId: string, reason: string) {
    return this.executeReviewAction(
      caseId,
      reviewerId,
      'REJECT',
      ReviewState.REJECTED,
      reason,
    );
  }

  async suspend(caseId: string, reviewerId: string, reason: string) {
    return this.executeReviewAction(
      caseId,
      reviewerId,
      'SUSPEND',
      ReviewState.SUSPENDED,
      reason,
    );
  }

  async expire(caseId: string, reviewerId: string, reason: string) {
    return this.executeReviewAction(
      caseId,
      reviewerId,
      'EXPIRE',
      ReviewState.EXPIRED,
      reason,
    );
  }

  async reopen(caseId: string, reviewerId: string, reason: string) {
    return this.executeReviewAction(
      caseId,
      reviewerId,
      'REOPEN',
      ReviewState.PENDING,
      reason,
    );
  }

  async overrideCheck(
    propertyId: string,
    reviewerId: string,
    checkType: string,
    reason: string,
  ) {
    if (!MANDATORY_CHECKS.includes(checkType)) {
      throw new BadRequestException('Invalid check type');
    }

    return this.prisma.$transaction(async (tx) => {
      let verification = await tx.propertyVerification.findFirst({
        where: { propertyId, checkType },
      });

      if (!verification) {
        verification = await tx.propertyVerification.create({
          data: {
            propertyId,
            checkType,
            status: VerificationStatus.VERIFIED,
            reviewerId,
            completedAt: new Date(),
          },
        });
      } else {
        verification = await tx.propertyVerification.update({
          where: { id: verification.id },
          data: {
            status: VerificationStatus.VERIFIED,
            reviewerId,
            completedAt: new Date(),
          },
        });
      }

      await this.auditService.log(tx, {
        actorId: reviewerId,
        action: `OVERRIDE_CHECK_${checkType}`,
        entityType: 'PROPERTY',
        entityId: propertyId,
        reason,
      });
      return verification;
    });
  }

  private async executeReviewAction(
    caseId: string,
    reviewerId: string,
    action: string,
    newState: ReviewState,
    reason: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const reviewCase = await tx.reviewCase.update({
        where: { id: caseId },
        data: { status: newState },
      });

      await tx.reviewAction.create({
        data: {
          caseId,
          reviewerId,
          actionTaken: action,
          notes: reason,
        },
      });

      await this.auditService.log(tx, {
        actorId: reviewerId,
        action: `REVIEW_CASE_${action}`,
        entityType: 'REVIEW_CASE',
        entityId: caseId,
        reason,
      });
      const property = tx.property?.findUnique
        ? await tx.property.findUnique({
            where: { id: reviewCase.targetId },
            select: { ownerId: true },
          })
        : null;
      if (property && action !== 'ASSIGN' && action !== 'REOPEN')
        if (tx.outboxEvent?.create)
          await tx.outboxEvent.create({
            data: {
              eventType: 'NOTIFICATION_REQUESTED',
              payload: {
                userId: property.ownerId,
                title: 'Listing review updated',
                body: `Your listing review was updated: ${action.toLowerCase()}.`,
                eventType: 'REVIEW_CHANGED',
                deduplicationKey: `review:${reviewCase.id}:${action}:${newState}`,
                channels: ['IN_APP', 'EMAIL'],
              } as any,
            },
          });

      return reviewCase;
    });
  }

  async getDecryptedIdentifiers(propertyId: string, reviewerId: string) {
    const identifiers = await this.prisma.propertyIdentifier.findMany({
      where: { propertyId },
      select: {
        id: true,
        identifierType: true,
        encryptedValue: true,
      },
    });

    // In a real system, we would decrypt using an envelope encryption service.
    // For sandbox/MVP, we'll just return a mock decrypted value (base64 decode simulation).
    const decrypted = identifiers.map((ident) => ({
      id: ident.id,
      type: ident.identifierType,
      value: `DECRYPTED_${ident.id.slice(0, 8)}`, // Mock decryption
    }));

    // Log the access for audit
    await this.prisma.auditLog.create({
      data: {
        actorId: reviewerId,
        action: 'PROPERTY_IDENTIFIERS_VIEWED',
        entityType: 'PROPERTY',
        entityId: propertyId,
      },
    });

    return { identifiers: decrypted };
  }
}
