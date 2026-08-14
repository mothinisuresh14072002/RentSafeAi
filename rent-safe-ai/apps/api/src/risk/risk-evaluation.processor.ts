import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { RiskService } from './risk.service';
import { PublishStatus, SignalStatus } from '@prisma/client';

interface EvaluateJobData {
  entityType: string;
  entityId: string;
}

@Processor('risk-evaluation')
export class RiskEvaluationProcessor extends WorkerHost {
  private readonly logger = new Logger(RiskEvaluationProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly riskService: RiskService,
  ) {
    super();
  }

  async process(job: Job<EvaluateJobData>) {
    const { entityType, entityId } = job.data;
    this.logger.log(`Evaluating risk for ${entityType}:${entityId}`);

    switch (entityType) {
      case 'Listing':
        await this.evaluateListing(entityId);
        break;
      case 'User':
        await this.evaluateUser(entityId);
        break;
      default:
        this.logger.warn(
          `Unknown entityType for risk evaluation: ${entityType}`,
        );
    }
  }

  private async evaluateListing(listingId: string) {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      include: {
        property: { include: { identifiers: true, documents: true } },
        media: true,
        versions: { orderBy: { versionNumber: 'desc' }, take: 1 },
      },
    });
    if (!listing) return;

    // Rule: CRITICAL_CHANGE_AFTER_APPROVAL
    // If there's more than one version AND the listing was approved before, signal it
    if (
      listing.versions.length > 1 &&
      listing.lifecycleState !== PublishStatus.DRAFT
    ) {
      await this.riskService.upsertSignal(
        'CRITICAL_CHANGE_AFTER_APPROVAL',
        'Listing',
        listingId,
        {
          currentVersion: listing.version,
          previousVersionCount: listing.versions.length,
          currentState: listing.lifecycleState,
        },
      );
    }

    // Rule: DUPLICATE_PROPERTY_ADDRESS
    const duplicateAddress = await this.prisma.property.findFirst({
      where: {
        normalizedAddressHash: listing.property.normalizedAddressHash,
        id: { not: listing.property.id },
        status: 'ACTIVE',
      },
    });
    if (duplicateAddress) {
      await this.riskService.upsertSignal(
        'DUPLICATE_PROPERTY_ADDRESS',
        'Listing',
        listingId,
        { conflictingPropertyId: duplicateAddress.id },
      );
    }

    // Rule: DUPLICATE_PROPERTY_IDENTIFIER
    for (const identifier of listing.property.identifiers) {
      const dup = await this.prisma.propertyIdentifier.findFirst({
        where: {
          normalizedHash: identifier.normalizedHash,
          propertyId: { not: listing.property.id },
        },
      });
      if (dup) {
        await this.riskService.upsertSignal(
          'DUPLICATE_PROPERTY_IDENTIFIER',
          'Listing',
          listingId,
          {
            conflictingIdentifierId: dup.id,
            identifierType: identifier.identifierType,
          },
        );
      }
    }

    // Rule: DUPLICATE_DOCUMENT_HASH
    for (const doc of listing.property.documents) {
      const dup = await this.prisma.propertyDocument.findFirst({
        where: {
          checksum: doc.checksum,
          id: { not: doc.id },
        },
      });
      if (dup) {
        await this.riskService.upsertSignal(
          'DUPLICATE_DOCUMENT_HASH',
          'Listing',
          listingId,
          { conflictingDocumentId: dup.id, checksum: doc.checksum },
        );
      }
    }

    // Rule: DUPLICATE_IMAGE_PHASH (Hamming distance <= 10 threshold)
    for (const media of listing.media) {
      const allMedia = await this.prisma.listingMedia.findMany({
        where: { id: { not: media.id } },
        select: { id: true, pHash: true, listingId: true },
      });
      for (const other of allMedia) {
        const distance = hammingDistance(media.pHash, other.pHash);
        if (distance <= 10) {
          await this.riskService.upsertSignal(
            'DUPLICATE_IMAGE_PHASH',
            'Listing',
            listingId,
            {
              mediaId: media.id,
              conflictingMediaId: other.id,
              conflictingListingId: other.listingId,
              hammingDistance: distance,
            },
          );
        }
      }
    }
  }

  private async evaluateUser(userId: string) {
    // Rule: REPEATED_REJECTION - count rejections in past 90 days
    const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const rejections = await this.prisma.reviewAction.count({
      where: {
        reviewerId: userId,
        actionTaken: 'REJECTED',
        createdAt: { gte: since },
      },
    });
    if (rejections >= 3) {
      await this.riskService.upsertSignal(
        'REPEATED_REJECTION',
        'User',
        userId,
        { rejectionCount: rejections, windowDays: 90 },
      );
    }
  }
}

/** Compute Hamming distance between two binary strings of equal length. */
function hammingDistance(a: string, b: string): number {
  if (a.length !== b.length) return Infinity;
  let dist = 0;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) dist++;
  }
  return dist;
}
