import { Test, TestingModule } from '@nestjs/testing';
import { FraudController } from './fraud.controller';
import { PrismaService } from '../common/prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { NotFoundException } from '@nestjs/common';

describe('FraudController', () => {
  let controller: FraudController;
  let prisma: PrismaService;
  let storage: StorageService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FraudController],
      providers: [
        {
          provide: PrismaService,
          useValue: {
            riskSignal: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
            },
            listingMedia: {
              findUnique: jest.fn(),
            },
          },
        },
        {
          provide: StorageService,
          useValue: {
            generatePresignedDownloadUrl: jest
              .fn()
              .mockResolvedValue('http://url'),
          },
        },
      ],
    }).compile();

    controller = module.get<FraudController>(FraudController);
    prisma = module.get<PrismaService>(PrismaService);
    storage = module.get<StorageService>(StorageService);
  });

  it('gets signals', async () => {
    jest
      .spyOn(prisma.riskSignal, 'findMany')
      .mockResolvedValue([{ id: 's1' }] as any);
    const result = await controller.getSignals(0, 10);
    expect(result.data.length).toBe(1);
    expect(prisma.riskSignal.findMany).toHaveBeenCalled();
  });

  it('compares media', async () => {
    jest.spyOn(prisma.riskSignal, 'findUnique').mockResolvedValue({
      id: 's1',
      ruleCode: 'NEAR_DUPLICATE_MEDIA',
      evidenceJson: {
        entityType: 'LISTING_MEDIA',
        entityId: 'm1',
        matchedEntityId: 'm2',
        similarityScore: 5,
      },
    } as any);

    jest
      .spyOn(prisma.listingMedia, 'findUnique')
      .mockResolvedValueOnce({
        id: 'm1',
        privateOriginalKey: 'k1',
        listingId: 'l1',
      } as any)
      .mockResolvedValueOnce({
        id: 'm2',
        privateOriginalKey: 'k2',
        listingId: 'l2',
      } as any);

    const result = await controller.getMediaComparison('s1');
    expect(result.similarityScore).toBe(5);
    expect(result.media1.url).toBe('http://url');
    expect(result.media2.url).toBe('http://url');
  });

  it('throws if not media type', async () => {
    jest.spyOn(prisma.riskSignal, 'findUnique').mockResolvedValue({
      id: 's1',
      ruleCode: 'EXACT_MATCH_DOCUMENT',
      evidenceJson: { entityType: 'PROPERTY_DOCUMENT' },
    } as any);

    await expect(controller.getMediaComparison('s1')).rejects.toThrow(
      NotFoundException,
    );
  });
});
