import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { AgreementStatus } from '@prisma/client';

// DISCLAIMER: Agreement templates provided here require independent Indian legal review.
// This system only records the existence and state of an agreement document.
// It does not validate, draft, or provide legal advice.
const DISCLAIMER =
  'DISCLAIMER: This platform does not provide legal drafting services. ' +
  'All agreement documents must be independently reviewed by a qualified ' +
  'Indian legal practitioner before execution.';

@Injectable()
export class AgreementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async createDraft(
    ownerId: string,
    listingId: string,
    tenantId: string,
    reason: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const listing = await tx.listing.findUnique({
        where: { id: listingId },
        include: { property: true },
      });
      if (!listing) throw new NotFoundException('Listing not found');
      if (listing.property.ownerId !== ownerId)
        throw new ForbiddenException('Not the listing owner');

      const agreement = await tx.agreement.create({
        data: {
          listingId,
          tenantId,
          ownerId,
          documentKey: '',
          status: AgreementStatus.DRAFT,
        },
      });

      await this.audit.log(tx, {
        actorId: ownerId,
        action: 'AGREEMENT_DRAFT_CREATED',
        entityType: 'Agreement',
        entityId: agreement.id,
        reason,
      });
      return { agreement, disclaimer: DISCLAIMER };
    });
  }

  async recordUpload(
    userId: string,
    agreementId: string,
    documentKey: string,
    reason: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const agreement = await this._getAndAuthorize(tx, userId, agreementId);

      if (agreement.status !== AgreementStatus.DRAFT) {
        throw new BadRequestException('Can only upload to DRAFT agreements');
      }

      const updated = await tx.agreement.update({
        where: { id: agreementId },
        data: { documentKey, status: AgreementStatus.UPLOADED },
      });

      await this.audit.log(tx, {
        actorId: userId,
        action: 'AGREEMENT_UPLOADED',
        entityType: 'Agreement',
        entityId: agreementId,
        reason,
      });
      return { updated, disclaimer: DISCLAIMER };
    });
  }

  async sign(userId: string, agreementId: string, reason: string) {
    return this.prisma.$transaction(async (tx) => {
      const agreement = await this._getAndAuthorize(tx, userId, agreementId);

      if (agreement.status !== AgreementStatus.UPLOADED) {
        throw new BadRequestException(
          'Agreement must be UPLOADED before signing',
        );
      }

      const updated = await tx.agreement.update({
        where: { id: agreementId },
        data: { status: AgreementStatus.SIGNED },
      });

      await this.audit.log(tx, {
        actorId: userId,
        action: 'AGREEMENT_SIGNED',
        entityType: 'Agreement',
        entityId: agreementId,
        reason,
      });
      return { updated, disclaimer: DISCLAIMER };
    });
  }

  async reject(userId: string, agreementId: string, reason: string) {
    return this.prisma.$transaction(async (tx) => {
      await this._getAndAuthorize(tx, userId, agreementId);

      const updated = await tx.agreement.update({
        where: { id: agreementId },
        data: { status: AgreementStatus.REJECTED },
      });

      await this.audit.log(tx, {
        actorId: userId,
        action: 'AGREEMENT_REJECTED',
        entityType: 'Agreement',
        entityId: agreementId,
        reason,
      });
      return updated;
    });
  }

  /**
   * Retrieve agreement state reference (not document contents) for payment policy.
   * Policy consumers only see status + reference ID — never the private document key.
   */
  async getStateReference(userId: string, agreementId: string) {
    const agreement = await this.prisma.agreement.findUnique({
      where: { id: agreementId },
    });
    if (!agreement) throw new NotFoundException('Agreement not found');

    const isParticipant =
      agreement.tenantId === userId || agreement.ownerId === userId;
    if (!isParticipant) throw new ForbiddenException('Not a participant');

    return {
      id: agreement.id,
      listingId: agreement.listingId,
      status: agreement.status,
      createdAt: agreement.createdAt,
      updatedAt: agreement.updatedAt,
      disclaimer: DISCLAIMER,
      // documentKey is intentionally excluded — payment policy only checks status
    };
  }

  private async _getAndAuthorize(tx: any, userId: string, agreementId: string) {
    const agreement = await tx.agreement.findUnique({
      where: { id: agreementId },
    });
    if (!agreement) throw new NotFoundException('Agreement not found');

    const isParticipant =
      agreement.tenantId === userId || agreement.ownerId === userId;
    if (!isParticipant)
      throw new ForbiddenException('Not a participant in this agreement');
    return agreement;
  }
}
