import { Test, TestingModule } from '@nestjs/testing';
import { FraudProcessor } from './fraud.processor';
import { PrismaService } from '../common/prisma/prisma.service';
import { SignalSeverity } from '@prisma/client';

describe('FraudProcessor', () => {
  let processor: FraudProcessor;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FraudProcessor,
        {
          provide: PrismaService,
          useValue: {
            propertyDocument: {
              findUnique: jest.fn(),
              findMany: jest.fn(),
            },
            listingMedia: {
              findUnique: jest.fn(),
              findMany: jest.fn(),
            },
            riskSignal: {
              findFirst: jest.fn(),
              create: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    processor = module.get<FraudProcessor>(FraudProcessor);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('processPropertyDocument', () => {
    it('creates a risk signal on exact match', async () => {
      jest.spyOn(prisma.propertyDocument, 'findUnique').mockResolvedValue({
        id: 'doc1',
        checksum: '12345',
        propertyId: 'prop1',
      } as any);

      jest
        .spyOn(prisma.propertyDocument, 'findMany')
        .mockResolvedValue([
          { id: 'doc2', checksum: '12345', propertyId: 'prop2' } as any,
        ]);

      jest.spyOn(prisma.riskSignal, 'findFirst').mockResolvedValue(null);
      const createSpy = jest
        .spyOn(prisma.riskSignal, 'create')
        .mockResolvedValue({} as any);

      await processor.process({
        data: { entityType: 'PROPERTY_DOCUMENT', entityId: 'doc1' },
      } as any);

      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            ruleCode: 'EXACT_MATCH_DOCUMENT',
            severity: SignalSeverity.HIGH,
          }),
        }),
      );
    });
  });

  describe('processListingMedia', () => {
    it('creates near-duplicate signal based on pHash threshold', async () => {
      jest.spyOn(prisma.listingMedia, 'findUnique').mockResolvedValue({
        id: 'med1',
        sha256Hash: 'a',
        pHash: '11110000',
        listingId: 'list1',
      } as any);

      // Exact match returns none
      jest.spyOn(prisma.listingMedia, 'findMany').mockResolvedValueOnce([]);

      // Near duplicate match returns something close (distance 2)
      jest
        .spyOn(prisma.listingMedia, 'findMany')
        .mockResolvedValueOnce([
          { id: 'med2', pHash: '11110011', listingId: 'list2' } as any,
        ]);

      jest.spyOn(prisma.riskSignal, 'findFirst').mockResolvedValue(null);
      const createSpy = jest
        .spyOn(prisma.riskSignal, 'create')
        .mockResolvedValue({} as any);

      await processor.process({
        data: { entityType: 'LISTING_MEDIA', entityId: 'med1' },
      } as any);

      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            ruleCode: 'NEAR_DUPLICATE_MEDIA',
            severity: SignalSeverity.MEDIUM,
          }),
        }),
      );
    });

    it('ignores pHashes beyond distance threshold', async () => {
      jest.spyOn(prisma.listingMedia, 'findUnique').mockResolvedValue({
        id: 'med1',
        sha256Hash: 'a',
        pHash: '1111111111111111',
        listingId: 'list1',
      } as any);

      jest.spyOn(prisma.listingMedia, 'findMany').mockResolvedValueOnce([]);

      // Distance > 10
      jest
        .spyOn(prisma.listingMedia, 'findMany')
        .mockResolvedValueOnce([
          { id: 'med2', pHash: '0000000000000000', listingId: 'list2' } as any,
        ]);

      const createSpy = jest.spyOn(prisma.riskSignal, 'create');

      await processor.process({
        data: { entityType: 'LISTING_MEDIA', entityId: 'med1' },
      } as any);

      expect(createSpy).not.toHaveBeenCalled();
    });
  });
});
