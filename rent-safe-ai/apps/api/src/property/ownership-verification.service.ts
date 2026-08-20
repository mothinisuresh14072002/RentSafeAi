import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { DocumentIntelligenceProvider } from './providers/document-intelligence.provider';
import { PropertyRegistryProvider } from './providers/property-registry.provider';
import { VERIFICATION_CHECK_TYPES } from './ownership.constants';
import { VerificationStatus, PropertyStatus, SignalSeverity } from '@prisma/client';
import { AuditService } from '../common/audit/audit.service';
import {
  calculateOwnershipConfidence,
  normalizeIdentityName,
} from './ownership-confidence';

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
      include: {
        owner: {
          include: {
            profile: true,
            ownerKycCases: {
              where: { status: VerificationStatus.VERIFIED },
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        },
      },
    });

    if (!property) throw new NotFoundException('Property not found');

    const document = await this.prisma.propertyDocument.findFirst({
      where: { id: documentId, propertyId },
    });

    if (!document) throw new NotFoundException('Ownership document not found');

    const ownerName =
      property.owner.ownerKycCases[0]?.normalizedName ||
      property.owner.profile?.displayName ||
      '';

    const structuredAddress = property.structuredAddress as Record<string, unknown>;
    const propertyAddress = Object.values(structuredAddress).filter(Boolean).join(' ');

    return this.prisma.$transaction(async (tx) => {
      const aiResult = await this.documentIntelligence.analyzeDocument(
        document.objectKey,
        document.mimeType,
      );

      await tx.propertyDocument.update({
        where: { id: documentId },
        data: { extractedFields: aiResult as any },
      });

      const documentAiStatus =
        aiResult.tamperRiskScore > 0.5 || !aiResult.ownerName
          ? VerificationStatus.NEEDS_REVIEW
          : VerificationStatus.VERIFIED;

      await tx.propertyVerification.create({
        data: {
          propertyId,
          checkType: VERIFICATION_CHECK_TYPES.DOCUMENT_AI,
          status: documentAiStatus,
          evidenceReference: documentId,
          completedAt: new Date(),
        },
      });

      if (aiResult.tamperRiskScore > 0.5 || !aiResult.ownerName) {
        await tx.riskSignal.create({
          data: {
            ruleCode: !aiResult.ownerName
              ? 'DOCUMENT_OWNER_NOT_EXTRACTED'
              : 'HIGH_TAMPER_RISK',
            severity: SignalSeverity.HIGH,
            entityType: 'PROPERTY',
            entityId: propertyId,
            evidenceJson: aiResult as any,
          },
        });
      }

      const registryResult = await this.propertyRegistry.lookupProperty(registryReference);
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

      const confidence = calculateOwnershipConfidence({
        ownerName,
        registryOwnerName: registryResult.legalOwnerName || '',
        documentOwnerName: aiResult.ownerName,
        propertyAddress,
        registryAddress: registryResult.address,
      });

      const ownershipMatchStatus =
        registryResult.exists && confidence.ownerMatch && confidence.documentMatch
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

      if (!confidence.ownerMatch || !confidence.documentMatch) {
        await tx.riskSignal.create({
          data: {
            ruleCode: 'OWNERSHIP_EVIDENCE_MISMATCH',
            severity: SignalSeverity.CRITICAL,
            entityType: 'PROPERTY',
            entityId: propertyId,
            evidenceJson: {
              owner: normalizeIdentityName(ownerName),
              registryOwner: normalizeIdentityName(registryResult.legalOwnerName),
              documentOwner: normalizeIdentityName(aiResult.ownerName),
              overallScore: confidence.overallScore,
              registryOwnerScore: confidence.registryOwnerScore,
              documentOwnerScore: confidence.documentOwnerScore,
            },
          },
        });
      }

      const hardChecksPassed =
        registryStatus === VerificationStatus.VERIFIED &&
        ownershipMatchStatus === VerificationStatus.VERIFIED &&
        documentAiStatus === VerificationStatus.VERIFIED &&
        confidence.addressMatch;

      await tx.property.update({
        where: { id: propertyId },
        data: { status: hardChecksPassed ? PropertyStatus.ACTIVE : PropertyStatus.INACTIVE },
      });

      if (hardChecksPassed) {
        await this.auditService.log(tx, {
          actorId: userId,
          action: 'PROPERTY_ACTIVATED',
          entityType: 'PROPERTY',
          entityId: propertyId,
          reason: 'Identity, document, registry and ownership checks passed',
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

    if (!property) throw new NotFoundException('Property not found');

    return {
      propertyStatus: property.status,
      checks: property.verifications,
    };
  }
}
