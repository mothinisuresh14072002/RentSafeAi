import { Test, TestingModule } from '@nestjs/testing';
import { PresenceService } from './presence.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { Policies } from '../auth/policies';
import { AuditService } from '../common/audit/audit.service';
import { VerificationStatus } from '@prisma/client';
import { BadRequestException } from '@nestjs/common';
import { GeoUtil } from '../common/utils/geo.util';

describe('PresenceService', () => {
  let service: PresenceService;
  let prisma: PrismaService;
  let policies: Policies;
  let audit: AuditService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PresenceService,
        {
          provide: PrismaService,
          useValue: {
            $transaction: jest.fn().mockImplementation((cb) => cb(prisma)),
            presenceChallenge: {
              findUnique: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              updateMany: jest.fn(),
            },
            propertyVerification: {
              create: jest.fn(),
            },
          },
        },
        {
          provide: Policies,
          useValue: {
            canAccessPropertyEvidence: jest.fn().mockResolvedValue(true),
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

    service = module.get<PresenceService>(PresenceService);
    prisma = module.get<PrismaService>(PrismaService);
    policies = module.get<Policies>(Policies);
    audit = module.get<AuditService>(AuditService);
  });

  describe('submitChallenge', () => {
    const validChallenge = {
      id: 'c1',
      propertyId: 'p1',
      status: VerificationStatus.PENDING,
      expiresAt: new Date(Date.now() + 100000),
      property: { latitude: 13.0, longitude: 80.0 },
    };

    it('throws if distance is greater than 200m', async () => {
      jest.spyOn(prisma.presenceChallenge, 'findUnique').mockResolvedValue(validChallenge as any);
      
      // Submit coordinates far away (e.g., 14.0, 80.0)
      await expect(service.submitChallenge('u1', 'p1', 'c1', {
        latitude: 14.0,
        longitude: 80.0,
        mediaKey: 'key',
      })).rejects.toThrow(/Geographic bounds exceeded/);

      expect(prisma.presenceChallenge.update).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ status: VerificationStatus.REJECTED }),
      }));
    });

    it('throws if challenge expired', async () => {
      jest.spyOn(prisma.presenceChallenge, 'findUnique').mockResolvedValue({
        ...validChallenge, expiresAt: new Date(Date.now() - 100000)
      } as any);

      await expect(service.submitChallenge('u1', 'p1', 'c1', {
        latitude: 13.0,
        longitude: 80.0,
        mediaKey: 'key',
      })).rejects.toThrow(/expired/);
    });

    it('creates property verification on successful distance check', async () => {
      jest.spyOn(prisma.presenceChallenge, 'findUnique').mockResolvedValue(validChallenge as any);
      const verifyCreateSpy = jest.spyOn(prisma.propertyVerification, 'create').mockResolvedValue({} as any);

      await service.submitChallenge('u1', 'p1', 'c1', {
        latitude: 13.0,
        longitude: 80.0001, // Very close
        mediaKey: 'my-media-key',
      });

      expect(prisma.presenceChallenge.update).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ status: VerificationStatus.VERIFIED }),
      }));
      expect(verifyCreateSpy).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          checkType: 'PRESENCE_PROOF',
          evidenceReference: 'my-media-key',
          status: VerificationStatus.PENDING,
        }),
      }));
      expect(audit.log).toHaveBeenCalled();
    });
  });
});
