import { Test, TestingModule } from '@nestjs/testing';
import { ListingService } from './listing.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { PublishStatus, ReviewState } from '@prisma/client';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('ListingService', () => {
  let service: ListingService;
  let prisma: PrismaService;
  let audit: AuditService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ListingService,
        {
          provide: PrismaService,
          useValue: {
            $transaction: jest.fn().mockImplementation((cb) => cb(prisma)),
            property: {
              findFirst: jest.fn(),
            },
            listing: {
              create: jest.fn(),
              update: jest.fn(),
              findUnique: jest.fn(),
            },
            listingVersion: {
              create: jest.fn(),
            },
          },
        },
        {
          provide: AuditService,
          useValue: {
            log: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ListingService>(ListingService);
    prisma = module.get<PrismaService>(PrismaService);
    audit = module.get<AuditService>(AuditService);
  });

  describe('updateListing', () => {
    it('creates version and drops to UNDER_REVIEW on critical change if PUBLISHED', async () => {
      jest.spyOn(prisma.listing, 'findUnique').mockResolvedValue({
        id: 'list1',
        rentAmount: 1000,
        lifecycleState: PublishStatus.PUBLISHED,
        version: 1,
        property: { ownerId: 'owner1' },
      } as any);

      const updateSpy = jest.spyOn(prisma.listing, 'update').mockResolvedValue({} as any);
      const versionSpy = jest.spyOn(prisma.listingVersion, 'create').mockResolvedValue({} as any);

      await service.updateListing('list1', 'owner1', { rentAmount: 2000 });

      expect(versionSpy).toHaveBeenCalled();
      expect(updateSpy).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          lifecycleState: PublishStatus.UNDER_REVIEW,
          rentAmount: 2000,
          version: 2,
        }),
      }));
    });

    it('updates normally if state is DRAFT without versioning', async () => {
      jest.spyOn(prisma.listing, 'findUnique').mockResolvedValue({
        id: 'list1',
        rentAmount: 1000,
        lifecycleState: PublishStatus.DRAFT,
        version: 1,
        property: { ownerId: 'owner1' },
      } as any);

      const updateSpy = jest.spyOn(prisma.listing, 'update').mockResolvedValue({} as any);
      const versionSpy = jest.spyOn(prisma.listingVersion, 'create');

      await service.updateListing('list1', 'owner1', { rentAmount: 2000 });

      expect(versionSpy).not.toHaveBeenCalled();
      expect(updateSpy).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          lifecycleState: PublishStatus.DRAFT,
          rentAmount: 2000,
          version: 1,
        }),
      }));
    });
  });

  describe('submitForReview', () => {
    it('throws if property is not approved', async () => {
      jest.spyOn(prisma.listing, 'findUnique').mockResolvedValue({
        id: 'list1',
        lifecycleState: PublishStatus.DRAFT,
        property: {
          ownerId: 'owner1',
          reviewCases: [{ targetType: 'PROPERTY', status: ReviewState.PENDING }],
        },
      } as any);

      await expect(service.submitForReview('list1', 'owner1')).rejects.toThrow(BadRequestException);
    });

    it('submits successfully if property is approved', async () => {
      jest.spyOn(prisma.listing, 'findUnique').mockResolvedValue({
        id: 'list1',
        lifecycleState: PublishStatus.DRAFT,
        property: {
          ownerId: 'owner1',
          reviewCases: [{ targetType: 'PROPERTY', status: ReviewState.APPROVED }],
        },
      } as any);

      const updateSpy = jest.spyOn(prisma.listing, 'update').mockResolvedValue({} as any);

      await service.submitForReview('list1', 'owner1');

      expect(updateSpy).toHaveBeenCalledWith(expect.objectContaining({
        data: { lifecycleState: PublishStatus.UNDER_REVIEW },
      }));
    });
  });

  describe('publish', () => {
    it('publishes verified listing successfully', async () => {
      jest.spyOn(prisma.listing, 'findUnique').mockResolvedValue({
        id: 'list1',
        lifecycleState: PublishStatus.VERIFIED,
        version: 1,
        property: {
          ownerId: 'owner1',
          reviewCases: [{ targetType: 'PROPERTY', status: ReviewState.APPROVED }],
        },
      } as any);

      const updateSpy = jest.spyOn(prisma.listing, 'update').mockResolvedValue({} as any);

      await service.publish('list1', 'reviewer1', 'OK');

      expect(updateSpy).toHaveBeenCalledWith(expect.objectContaining({
        data: { lifecycleState: PublishStatus.PUBLISHED, publishedVersion: 1 },
      }));
    });
  });
});
