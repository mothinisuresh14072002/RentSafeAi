import { Test, TestingModule } from '@nestjs/testing';
import { StorageController } from './storage.controller';
import { StorageService } from './storage.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { Policies } from '../auth/policies';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { QuarantineStatus } from '@prisma/client';

describe('StorageController', () => {
  let controller: StorageController;
  let policies: Policies;
  let storage: StorageService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StorageController],
      providers: [
        {
          provide: StorageService,
          useValue: {
            generatePresignedUploadUrl: jest.fn().mockResolvedValue('http://upload.url'),
            generatePresignedDownloadUrl: jest.fn().mockResolvedValue('http://download.url'),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            propertyDocument: {
              create: jest.fn(),
              findUnique: jest.fn(),
              updateMany: jest.fn(),
            },
            listing: {
              findFirst: jest.fn().mockResolvedValue({ id: 'l1' }),
              create: jest.fn(),
            },
            listingMedia: {
              create: jest.fn(),
              findUnique: jest.fn(),
              updateMany: jest.fn(),
            },
          },
        },
        {
          provide: Policies,
          useValue: {
            canAccessPropertyEvidence: jest.fn().mockResolvedValue(true),
          },
        },
      ],
    }).compile();

    controller = module.get<StorageController>(StorageController);
    policies = module.get<Policies>(Policies);
    storage = module.get<StorageService>(StorageService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('requestUploadUrl', () => {
    it('throws if unauthorized owner tries to upload', async () => {
      jest.spyOn(policies, 'canAccessPropertyEvidence').mockRejectedValue(new ForbiddenException());
      await expect(controller.requestUploadUrl({ user: { userId: 'bad_user' } } as any, {
        propertyId: 'p1',
        targetType: 'DOCUMENT',
        extension: 'pdf',
        mimeType: 'application/pdf',
        size: 1000,
      })).rejects.toThrow(ForbiddenException);
    });

    it('rejects spoofed or invalid mimes for documents', async () => {
      await expect(controller.requestUploadUrl({ user: { userId: 'u1' } } as any, {
        propertyId: 'p1',
        targetType: 'DOCUMENT',
        extension: 'exe',
        mimeType: 'application/pdf', // Spoofed mime, wrong extension
        size: 1000,
      })).rejects.toThrow(BadRequestException);
    });

    it('returns signed URL for valid document', async () => {
      const res = await controller.requestUploadUrl({ user: { userId: 'u1' } } as any, {
        propertyId: 'p1',
        targetType: 'DOCUMENT',
        extension: 'pdf',
        mimeType: 'application/pdf',
        size: 1000,
      });

      expect(res.uploadUrl).toBe('http://upload.url');
      expect(res.objectKey).toContain('p1/documents/');
    });
  });

  describe('getMediaUrl', () => {
    it('throws if file is quarantined or infected', async () => {
      jest.spyOn(prisma.propertyDocument, 'findUnique').mockResolvedValue({
        id: 'd1', propertyId: 'p1', quarantineStatus: QuarantineStatus.PENDING_SCAN, objectKey: 'k1',
      } as any);

      await expect(controller.getMediaUrl({ user: { userId: 'u1', roles: ['OWNER'] } } as any, 'd1'))
        .rejects.toThrow(/quarantined/);
    });

    it('returns download url if file is CLEARED', async () => {
      jest.spyOn(prisma.propertyDocument, 'findUnique').mockResolvedValue({
        id: 'd1', propertyId: 'p1', quarantineStatus: QuarantineStatus.CLEARED, objectKey: 'k1',
      } as any);

      const res = await controller.getMediaUrl({ user: { userId: 'u1', roles: ['OWNER'] } } as any, 'd1');
      expect(res.url).toBe('http://download.url');
      expect(storage.generatePresignedDownloadUrl).toHaveBeenCalledWith('k1');
    });
  });
});
