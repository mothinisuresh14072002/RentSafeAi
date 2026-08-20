import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { DocumentIntelligenceProvider } from './providers/document-intelligence.provider';
import { PropertyRegistryProvider } from './providers/property-registry.provider';
import { VERIFICATION_CHECK_TYPES } from './ownership.constants';
import { VerificationStatus, PropertyStatus, SignalSeverity } from '@prisma/client';
import { AuditService } from '../common/audit/audit.service';

@Injectable()
export class OwnershipVerificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly documentIntelligence: DocumentIntelligenceProvider,
    private readonly propertyRegistry: PropertyRegistryProvider,
    private readonly auditService: AuditService,
  ) {}

  async verifyOwnership(
    userId: string,
    propertyId: string,
    documentId: string,
    registryReference: string,
  ) {
    const property = await this.prisma.property.findFirst({
      where: { id: propertyId, ownerId: userId },
      include: { owner: { include: { profile: true } } },
    });

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    const document = await this.prisma.propertyDocument.findFirst({
      where: { id: documentId, propertyId },
    });

    if (!document) {
      throw new NotFoundException('Ownership document not found');
    }

    const ownerName = property.owner.profile?.displayName || '';

    return this.prisma.$transaction(async (tx) => {
      // 1. Run AI Document Intelligence
      // In production, we'd fetch the presigned URL for the objectKey
      const aiResult = await this.documentIntelligence.analyzeDocument(
        document.objectKey,
        document.mimeType,
      );

      // Create AI verification record
      await tx.propertyVerification.create({
        data: {
          propertyId,
          checkType: VERIFICATION_CHECK_TYPES.DOCUMENT_AI,
          status:
            aiResult.tamperRiskScore > 0.5
              ? VerificationStatus.NEEDS_REVIEW
              : VerificationStatus.VERIFIED,
          evidenceReference: documentId,
          completedAt: new Date(),
        },
      });

      if (aiResult.tamperRiskScore > 0.5) {
        await tx.riskSignal.create({
          data: {
            ruleCode: 'HIGH_TAMPER_RISK',
            severity: SignalSeverity.HIGH,
            entityType: 'PROPERTY',
            entityId: propertyId,
            evidenceJson: aiResult as any,
          },
        });
      }

      // 2. Authoritative Registry Check
      const registryResult = await this.propertyRegistry.lookupProperty(
        registryReference,
      );

      const registryStatus = registryResult.exists
        ? VerificationStatus.VERIFIED
        : VerificationStatus.REJECTED;

      await tx.propertyVerification.create({
        data: {
          propertyId,
          checkType: VERIFICATION_CHECK_TYPES.REGISTRY_EXISTENCE,
          status: registryStatus,
          evidenceReference: registryReference,
          completedAt: new Date(),
        },
      });

      // 3. Ownership Match
      let ownershipMatchStatus = VerificationStatus.PENDING;
      if (registryResult.exists) {
        // Basic naive string matching for sandbox. Production needs robust fuzzy matching
        const isMatch =
          registryResult.legalOwnerName?.toLowerCase() ===
          ownerName.toLowerCase();
        
        ownershipMatchStatus = isMatch
          ? VerificationStatus.VERIFIED
          : VerificationStatus.REJECTED;

        await tx.propertyVerification.create({
          data: {
            propertyId,
            checkType: VERIFICATION_CHECK_TYPES.OWNERSHIP_MATCH,
            status: ownershipMatchStatus,
            evidenceReference: registryReference,
            completedAt: new Date(),
          },
        });

        if (!isMatch) {
          await tx.riskSignal.create({
            data: {
              ruleCode: 'OWNERSHIP_MISMATCH',
              severity: SignalSeverity.CRITICAL,
              entityType: 'PROPERTY',
              entityId: propertyId,
              evidenceJson: { expected: ownerName, actual: registryResult.legalOwnerName },
            },
          });
        }
      }

      // 4. Update Property Status
      // A property becomes ACTIVE only when both hard checks pass
      if (
        registryStatus === VerificationStatus.VERIFIED &&
        ownershipMatchStatus === VerificationStatus.VERIFIED
      ) {
        await tx.property.update({
          where: { id: propertyId },
          data: { status: PropertyStatus.ACTIVE },
        });

        await this.auditService.log(tx, {
          actorId: userId,
          action: 'PROPERTY_ACTIVATED',
          entityType: 'PROPERTY',
          entityId: propertyId,
          reason: 'Hard ownership checks passed',
        });
      }

      return this.getVerificationStatus(tx as any, propertyId);
    });
  }

  async getVerificationStatus(prismaClient: PrismaService, propertyId: string) {
    const property = await prismaClient.property.findUnique({
      where: { id: propertyId },
      include: { verifications: true },
    });

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    return {
      propertyStatus: property.status,
      checks: property.verifications,
    };
  }
}
