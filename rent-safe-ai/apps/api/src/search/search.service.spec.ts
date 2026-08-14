import { Test, TestingModule } from '@nestjs/testing';
import { SearchService } from './search.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { PublishStatus, VerificationStatus } from '@prisma/client';

describe('SearchService', () => {
  let service: SearchService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        {
          provide: PrismaService,
          useValue: {
            listing: {
              findMany: jest.fn(),
              count: jest.fn(),
              findUnique: jest.fn(),
            },
          },
        },
        {
          provide: StorageService,
          useValue: {
            generatePresignedDownloadUrl: jest.fn().mockResolvedValue('http://signed.url'),
          },
        },
      ],
    }).compile();

    service = module.get<SearchService>(SearchService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('searchListings', () => {
    it('applies filters correctly and returns mapped DTOs', async () => {
      const mockListing = {
        id: '1',
        rentAmount: 15000,
        property: { type: 'APARTMENT', locality: 'Adyar' },
        media: [],
      };

      jest.spyOn(prisma.listing, 'findMany').mockResolvedValue([mockListing] as any);
      jest.spyOn(prisma.listing, 'count').mockResolvedValue(1);

      const result = await service.searchListings({ minRent: 10000, locality: 'Adyar' }, {});

      expect(prisma.listing.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({
          lifecycleState: PublishStatus.PUBLISHED,
          rentAmount: { gte: 10000 },
          property: expect.objectContaining({
            AND: expect.arrayContaining([{ locality: 'Adyar' }]),
          }),
        }),
      }));

      expect(result.data.length).toBe(1);
      expect(result.data[0].property.locality).toBe('Adyar');
      expect((result.data[0].property as any).doorNumber).toBeUndefined(); // Obfuscated
    });
  });

  describe('getPublicListing', () => {
    it('returns DTO with verification badges and safety warning', async () => {
      const mockListing = {
        id: '1',
        rentAmount: 15000,
        property: {
          type: 'APARTMENT',
          verifications: [
            { checkType: 'IDENTITY_KYC', status: VerificationStatus.VERIFIED, completedAt: new Date() },
          ],
        },
        media: [{ id: 'm1', publicDerivativeKey: 'key1' }],
      };

      jest.spyOn(prisma.listing, 'findUnique').mockResolvedValue(mockListing as any);

      const result = await service.getPublicListing('1');

      expect(result.id).toBe('1');
      expect(result.safetyWarning).toContain('SAFETY WARNING');
      expect(result.ownerDescription).toBe('Listed by verified owner');
      expect(result.verifications.length).toBe(1);
      expect(result.verifications[0].checkType).toBe('IDENTITY_KYC');
      expect(result.media[0].url).toBe('http://signed.url');
    });

    it('throws if not published', async () => {
      jest.spyOn(prisma.listing, 'findUnique').mockResolvedValue(null);
      await expect(service.getPublicListing('1')).rejects.toThrow();
    });
  });
});
