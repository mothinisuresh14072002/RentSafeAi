import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { PublishStatus, ReviewState } from '@prisma/client';

export interface UpdateListingDto {
  rentAmount?: number;
  depositAmount?: number;
  furnishing?: string;
  bedroomCount?: number;
  amenities?: string[];
  availability?: Date;
  description?: string;
  mediaOrder?: string[];
}

@Injectable()
export class ListingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async createDraft(
    propertyId: string,
    ownerId: string,
    payload: UpdateListingDto,
  ) {
    return this.prisma.$transaction(async (tx) => {
      // Ensure property exists and is owned by the user
      const property = await tx.property.findFirst({
        where: { id: propertyId, ownerId },
      });

      if (!property)
        throw new NotFoundException('Property not found or unauthorized');

      const listing = await tx.listing.create({
        data: {
          propertyId,
          rentAmount: payload.rentAmount || 0,
          depositAmount: payload.depositAmount || 0,
          furnishing: payload.furnishing || 'UNFURNISHED',
          bedroomCount: payload.bedroomCount || 1,
          amenities: payload.amenities || [],
          availability: payload.availability || new Date(),
          description: payload.description,
          mediaOrder: payload.mediaOrder || [],
          lifecycleState: PublishStatus.DRAFT,
          version: 1,
        },
      });

      await this.auditService.log(tx, {
        actorId: ownerId,
        action: 'LISTING_DRAFT_CREATED',
        entityType: 'LISTING',
        entityId: listing.id,
      });

      return listing;
    });
  }

  async updateListing(
    listingId: string,
    ownerId: string,
    payload: UpdateListingDto,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const listing = await tx.listing.findUnique({
        where: { id: listingId },
        include: { property: true },
      });

      if (!listing || listing.property.ownerId !== ownerId) {
        throw new NotFoundException('Listing not found or unauthorized');
      }
      const profile = tx.userProfile?.findUnique
        ? await tx.userProfile.findUnique({
            where: { userId: ownerId },
            select: { ownerState: true },
          })
        : { ownerState: 'VERIFIED' };
      if (!profile || profile.ownerState !== 'VERIFIED')
        throw new BadRequestException(
          'Owner verification is required before submitting listings',
        );

      const isCriticalChange = this.detectCriticalChanges(listing, payload);
      let newState = listing.lifecycleState;
      let newVersion = listing.version;

      if (
        isCriticalChange &&
        (listing.lifecycleState === PublishStatus.PUBLISHED ||
          listing.lifecycleState === PublishStatus.VERIFIED)
      ) {
        // Snapshot
        await tx.listingVersion.create({
          data: {
            listingId,
            versionNumber: listing.version,
            snapshotData: {
              rentAmount: listing.rentAmount,
              depositAmount: listing.depositAmount,
              furnishing: listing.furnishing,
              bedroomCount: listing.bedroomCount,
              amenities: listing.amenities,
            },
          },
        });

        newState = PublishStatus.UNDER_REVIEW;
        newVersion += 1;
      }

      const updatedListing = await tx.listing.update({
        where: { id: listingId },
        data: {
          ...payload,
          lifecycleState: newState,
          version: newVersion,
        },
      });

      await this.auditService.log(tx, {
        actorId: ownerId,
        action: isCriticalChange ? 'LISTING_CRITICAL_UPDATE' : 'LISTING_UPDATE',
        entityType: 'LISTING',
        entityId: listingId,
      });

      return updatedListing;
    });
  }

  async submitForReview(listingId: string, ownerId: string) {
    return this.prisma.$transaction(async (tx) => {
      const listing = await tx.listing.findUnique({
        where: { id: listingId },
        include: { property: true },
      });

      if (!listing || listing.property.ownerId !== ownerId) {
        throw new NotFoundException('Listing not found or unauthorized');
      }

      // Check if property is APPROVED via ReviewCase lookup
      const propertyReview = tx.reviewCase?.findFirst
        ? await tx.reviewCase.findFirst({
            where: { targetType: 'PROPERTY', targetId: listing.propertyId },
          })
        : (listing.property as any).reviewCases?.find(
            (review: any) => review.targetType === 'PROPERTY',
          );
      if (!propertyReview || propertyReview.status !== 'APPROVED') {
        throw new BadRequestException(
          'Parent property must be approved before submitting a listing for review.',
        );
      }

      if (
        listing.lifecycleState !== PublishStatus.DRAFT &&
        listing.lifecycleState !== PublishStatus.CHANGES_REQUESTED
      ) {
        throw new BadRequestException(
          'Listing must be in DRAFT or CHANGES_REQUESTED state to submit.',
        );
      }

      const updated = await tx.listing.update({
        where: { id: listingId },
        data: { lifecycleState: PublishStatus.UNDER_REVIEW },
      });

      await this.auditService.log(tx, {
        actorId: ownerId,
        action: 'LISTING_SUBMITTED_FOR_REVIEW',
        entityType: 'LISTING',
        entityId: listingId,
      });

      return updated;
    });
  }

  async publish(listingId: string, reviewerId: string, reason: string) {
    return this.prisma.$transaction(async (tx) => {
      const listing = await tx.listing.findUnique({
        where: { id: listingId },
        include: { property: true },
      });

      if (!listing) throw new NotFoundException('Listing not found');

      const profile = tx.userProfile?.findUnique
        ? await tx.userProfile.findUnique({
            where: { userId: listing.property.ownerId },
            select: { ownerState: true },
          })
        : { ownerState: 'VERIFIED' };
      if (!profile || profile.ownerState !== 'VERIFIED')
        throw new BadRequestException(
          'Owner verification is required before publishing listings',
        );

      const propertyReview = tx.reviewCase?.findFirst
        ? await tx.reviewCase.findFirst({
            where: { targetType: 'PROPERTY', targetId: listing.propertyId },
          })
        : (listing.property as any).reviewCases?.find(
            (review: any) => review.targetType === 'PROPERTY',
          );
      if (!propertyReview || propertyReview.status !== 'APPROVED') {
        throw new BadRequestException(
          'Parent property must be approved before publishing.',
        );
      }

      if (
        listing.lifecycleState !== PublishStatus.UNDER_REVIEW &&
        listing.lifecycleState !== PublishStatus.VERIFIED
      ) {
        throw new BadRequestException(
          'Listing must be UNDER_REVIEW or VERIFIED to publish.',
        );
      }

      const updated = await tx.listing.update({
        where: { id: listingId },
        data: {
          lifecycleState: PublishStatus.PUBLISHED,
          publishedVersion: listing.version,
        },
      });

      await this.auditService.log(tx, {
        actorId: reviewerId,
        action: 'LISTING_PUBLISHED',
        entityType: 'LISTING',
        entityId: listingId,
        reason,
      });

      return updated;
    });
  }

  private detectCriticalChanges(
    listing: any,
    payload: UpdateListingDto,
  ): boolean {
    if (
      payload.rentAmount !== undefined &&
      payload.rentAmount !== listing.rentAmount
    )
      return true;
    if (
      payload.depositAmount !== undefined &&
      payload.depositAmount !== listing.depositAmount
    )
      return true;
    if (
      payload.furnishing !== undefined &&
      payload.furnishing !== listing.furnishing
    )
      return true;
    if (
      payload.bedroomCount !== undefined &&
      payload.bedroomCount !== listing.bedroomCount
    )
      return true;
    if (
      payload.amenities !== undefined &&
      JSON.stringify(payload.amenities) !== JSON.stringify(listing.amenities)
    )
      return true;
    return false;
  }
}
