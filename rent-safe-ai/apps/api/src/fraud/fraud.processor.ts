import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from '../common/prisma/prisma.service';
import { HammingDistanceUtil } from '../common/utils/hamming.util';
import { SignalSeverity, SignalStatus } from '@prisma/client';
import { Logger } from '@nestjs/common';

export interface DuplicateDetectionJobData {
  entityType: 'PROPERTY_DOCUMENT' | 'LISTING_MEDIA';
  entityId: string;
}

@Processor('duplicate-detection')
export class FraudProcessor extends WorkerHost {
  private readonly logger = new Logger(FraudProcessor.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job<DuplicateDetectionJobData>): Promise<void> {
    const { entityType, entityId } = job.data;
    this.logger.log(
      `Processing duplicate detection for ${entityType} ${entityId}`,
    );

    if (entityType === 'PROPERTY_DOCUMENT') {
      await this.processPropertyDocument(entityId);
    } else if (entityType === 'LISTING_MEDIA') {
      await this.processListingMedia(entityId);
    }
  }

  private async processPropertyDocument(entityId: string) {
    const doc = await this.prisma.propertyDocument.findUnique({
      where: { id: entityId },
      select: { id: true, checksum: true, propertyId: true },
    });

    if (!doc) return;

    // Exact Match (Same Checksum, Different Property)
    const exactMatches = await this.prisma.propertyDocument.findMany({
      where: {
        checksum: doc.checksum,
        propertyId: { not: doc.propertyId },
        id: { not: doc.id },
      },
    });

    for (const match of exactMatches) {
      await this.createSignal('EXACT_MATCH_DOCUMENT', SignalSeverity.HIGH, {
        entityType: 'PROPERTY_DOCUMENT',
        entityId: doc.id,
        matchedEntityId: match.id,
        similarityScore: 100,
      });
    }
  }

  private async processListingMedia(entityId: string) {
    const media = await this.prisma.listingMedia.findUnique({
      where: { id: entityId },
      select: { id: true, sha256Hash: true, pHash: true, listingId: true },
    });

    if (!media) return;

    // Exact Match
    const exactMatches = await this.prisma.listingMedia.findMany({
      where: {
        sha256Hash: media.sha256Hash,
        listingId: { not: media.listingId },
        id: { not: media.id },
      },
    });

    for (const match of exactMatches) {
      await this.createSignal('EXACT_MATCH_MEDIA', SignalSeverity.HIGH, {
        entityType: 'LISTING_MEDIA',
        entityId: media.id,
        matchedEntityId: match.id,
        similarityScore: 100,
      });
    }

    // Near Duplicate using pHash
    if (media.pHash && media.pHash !== 'pending') {
      const allOtherMedia = await this.prisma.listingMedia.findMany({
        where: {
          listingId: { not: media.listingId },
          id: { not: media.id },
          pHash: { not: 'pending' },
        },
      });

      for (const other of allOtherMedia) {
        if (!other.pHash) continue;
        try {
          const distance = HammingDistanceUtil.calculate(
            media.pHash,
            other.pHash,
          );
          if (distance <= 10) {
            // Configurable threshold
            await this.createSignal(
              'NEAR_DUPLICATE_MEDIA',
              SignalSeverity.MEDIUM,
              {
                entityType: 'LISTING_MEDIA',
                entityId: media.id,
                matchedEntityId: other.id,
                similarityScore: distance, // We store distance as the score
              },
            );
          }
        } catch (e) {
          this.logger.warn(
            `Failed to calculate hamming distance for ${media.id} and ${other.id}`,
          );
        }
      }
    }
  }

  private async createSignal(
    ruleCode: string,
    severity: SignalSeverity,
    evidence: any,
  ) {
    await this.prisma.riskSignal.create({
      data: {
        ruleCode,
        severity,
        entityType: evidence.entityType,
        entityId: evidence.entityId,
        evidenceJson: evidence,
        status: SignalStatus.ACTIVE,
      },
    });
    this.logger.warn(
      `Risk signal generated for ${ruleCode} on entity ${evidence.entityId}`,
    );
  }
}
