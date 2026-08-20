import {
  Injectable,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { SandboxGeocodingProvider } from './providers/sandbox-geocoding.provider';
import { StructuredAddressDto } from './providers/geocoding.provider';
import { AddressNormalizer } from './utils/address.normalizer';
import {
  isValidChennaiLocality,
  isValidChennaiPinCode,
} from './data/chennai-localities';
import { Policies } from '../auth/policies';
import { PropertyType, PropertyStatus } from '@prisma/client';
import { AuditService } from '../common/audit/audit.service';
import * as crypto from 'crypto';

export interface RegisterPropertyDto {
  propertyType: PropertyType;
  address: StructuredAddressDto;
  identifiers: { type: string; value: string }[];
}

@Injectable()
export class PropertyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly geocodingProvider: SandboxGeocodingProvider,
    private readonly policies: Policies,
    private readonly auditService: AuditService,
  ) {}

  async registerProperty(ownerId: string, dto: RegisterPropertyDto) {
    // 1. Policy Guard: Verify owner is eligible to submit
    await this.policies.canSubmitProperty(ownerId);

    // 2. Validation
    if (!isValidChennaiLocality(dto.address.locality)) {
      throw new BadRequestException(
        `Locality ${dto.address.locality} is not within our supported Chennai bounds.`,
      );
    }
    if (!isValidChennaiPinCode(dto.address.pinCode)) {
      throw new BadRequestException(
        `PIN Code ${dto.address.pinCode} is not a valid Chennai boundary.`,
      );
    }

    // 3. Geocoding
    const coords = await this.geocodingProvider.geocodeAddress(dto.address);

    // 4. Normalization and Hashing
    const normalizedAddressHash = AddressNormalizer.hashAddress(dto.address);

    return this.prisma.$transaction(async (tx) => {
      // Deduplication explicit check for MVP readability, though unique constraint catches it
      const existing = await tx.property.findUnique({
        where: { normalizedAddressHash },
      });

      if (existing) {
        throw new ConflictException(
          'A property at this exact address is already registered.',
        );
      }

      const property = await tx.property.create({
        data: {
          ownerId,
          propertyType: dto.propertyType,
          structuredAddress: dto.address as any,
          chennaiLocality: dto.address.locality.toUpperCase().trim(),
          latitude: coords.latitude,
          longitude: coords.longitude,
          normalizedAddressHash,
          status: PropertyStatus.INACTIVE,
        },
      });

      // 5. Identifiers
      for (const idf of dto.identifiers) {
        const normalizedHash = crypto
          .createHash('sha256')
          .update(idf.value.trim().toLowerCase())
          .digest('hex');
        const encryptedValue = Buffer.from(`enc_${idf.value}`).toString(
          'base64',
        );

        // Note: we might want to check duplicate identifier here globally, but schema handles constraints if we add them.
        // For MVP, we will just store it.
        await tx.propertyIdentifier.create({
          data: {
            propertyId: property.id,
            identifierType: idf.type,
            encryptedValue,
            normalizedHash,
          },
        });
      }

      await this.auditService.log(tx, {
        actorId: ownerId,
        action: 'PROPERTY_REGISTERED',
        entityType: 'PROPERTY',
        entityId: property.id,
      });

      return property;
    });
  }
}
