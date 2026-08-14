import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { PublishStatus, VerificationStatus } from '@prisma/client';

export interface SearchFilters {
  locality?: string;
  minRent?: number;
  maxRent?: number;
  minDeposit?: number;
  maxDeposit?: number;
  bedrooms?: number;
  furnishing?: string;
  propertyType?: string;
  availability?: Date;
}

export interface PaginationSort {
  skip?: number;
  take?: number;
  sortBy?: 'rentAmount' | 'createdAt';
  sortDir?: 'asc' | 'desc';
}

@Injectable()
export class SearchService {
  private readonly SAFETY_WARNING = 'SAFETY WARNING: Never transfer money outside of the platform. RentSafe AI will never ask for a wire transfer or cash. All payments must be routed through the platform to guarantee safety and fraud protection.';
  private readonly OWNER_WORDING = 'Listed by verified owner';

  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
  ) {}

  async searchListings(filters: SearchFilters, pagination: PaginationSort) {
    const skip = Number(pagination.skip) || 0;
    const take = Number(pagination.take) || 20;
    const orderBy = {};
    if (pagination.sortBy) {
      orderBy[pagination.sortBy] = pagination.sortDir || 'desc';
    } else {
      orderBy['createdAt'] = 'desc';
    }

    const where: any = {
      lifecycleState: PublishStatus.PUBLISHED,
      property: {
        AND: [],
      },
    };

    if (filters.locality) {
      where.property.AND.push({ locality: filters.locality });
    }
    if (filters.propertyType) {
      where.property.AND.push({ type: filters.propertyType });
    }
    if (filters.minRent) {
      where.rentAmount = { ...where.rentAmount, gte: Number(filters.minRent) };
    }
    if (filters.maxRent) {
      where.rentAmount = { ...where.rentAmount, lte: Number(filters.maxRent) };
    }
    if (filters.minDeposit) {
      where.depositAmount = { ...where.depositAmount, gte: Number(filters.minDeposit) };
    }
    if (filters.maxDeposit) {
      where.depositAmount = { ...where.depositAmount, lte: Number(filters.maxDeposit) };
    }
    if (filters.bedrooms) {
      where.bedroomCount = Number(filters.bedrooms);
    }
    if (filters.furnishing) {
      where.furnishing = filters.furnishing;
    }
    if (filters.availability) {
      where.availability = { gte: new Date(filters.availability) };
    }

    if (where.property.AND.length === 0) {
      delete where.property;
    }

    const listings = await this.prisma.listing.findMany({
      where,
      skip,
      take,
      orderBy,
      include: {
        property: true,
        media: { where: { reviewState: 'APPROVED' } },
      },
    });

    const total = await this.prisma.listing.count({ where });

    const mapped = await Promise.all(listings.map(l => this.mapToPublicDto(l)));

    return {
      data: mapped,
      total,
      skip,
      take,
    };
  }

  async getPublicListing(id: string) {
    const listing = await this.prisma.listing.findUnique({
      where: { id, lifecycleState: PublishStatus.PUBLISHED },
      include: {
        property: {
          include: {
            verifications: true,
          },
        },
        media: { where: { reviewState: 'APPROVED' } },
      },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found or not published');
    }

    return this.mapToPublicDto(listing, true);
  }

  private async mapToPublicDto(listing: any, includeVerifications: boolean = false) {
    // Media URLs
    const mediaUrls = await Promise.all(
      listing.media.map(async (m) => {
        // We use publicDerivativeKey to generate presigned URLs safely
        return {
          id: m.id,
          url: await this.storageService.generatePresignedDownloadUrl(m.publicDerivativeKey),
        };
      })
    );

    const dto: any = {
      id: listing.id,
      rentAmount: listing.rentAmount,
      depositAmount: listing.depositAmount,
      furnishing: listing.furnishing,
      bedroomCount: listing.bedroomCount,
      amenities: listing.amenities,
      description: listing.description,
      availability: listing.availability,
      createdAt: listing.createdAt,
      media: mediaUrls,
      ownerDescription: this.OWNER_WORDING,
      safetyWarning: this.SAFETY_WARNING,
      property: {
        type: listing.property.type,
        locality: listing.property.locality,
        street: listing.property.street,
        city: listing.property.city,
        state: listing.property.state,
        pinCode: listing.property.pinCode,
        // Door number and internal IDs are obfuscated/stripped
      },
    };

    if (includeVerifications && listing.property.verifications) {
      dto.verifications = listing.property.verifications
        .filter((v) => v.status === VerificationStatus.VERIFIED || v.status === 'APPROVED' as any)
        .map((v) => ({
          checkType: v.checkType,
          verifiedAt: v.completedAt || v.updatedAt,
        }));
    }

    return dto;
  }
}
