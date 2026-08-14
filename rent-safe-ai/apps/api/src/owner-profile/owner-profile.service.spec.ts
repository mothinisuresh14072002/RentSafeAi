import { Test, TestingModule } from '@nestjs/testing';
import { OwnerProfileService } from './owner-profile.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { OwnerState, Role } from '@prisma/client';
import { BadRequestException } from '@nestjs/common';

describe('OwnerProfileService', () => {
  let service: OwnerProfileService;
  let prisma: PrismaService;
  let audit: AuditService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OwnerProfileService,
        {
          provide: PrismaService,
          useValue: {
            $transaction: jest.fn().mockImplementation((cb) => cb(prisma)),
            userProfile: {
              findUnique: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
            },
            user: {
              findUnique: jest.fn(),
              update: jest.fn(),
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

    service = module.get<OwnerProfileService>(OwnerProfileService);
    prisma = module.get<PrismaService>(PrismaService);
    audit = module.get<AuditService>(AuditService);
  });

  describe('upsertProfile', () => {
    it('creates a new profile and upgrades role if tenant', async () => {
      jest.spyOn(prisma.userProfile, 'findUnique').mockResolvedValue(null);
      jest.spyOn(prisma.userProfile, 'create').mockResolvedValue({
        id: 'p1',
        ownerState: OwnerState.PROFILE_PENDING,
      } as any);
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        id: 'u1',
        role: Role.TENANT,
        isPhoneVerified: false,
      } as any);
      const userUpdateSpy = jest
        .spyOn(prisma.user, 'update')
        .mockResolvedValue(null as any);

      await service.upsertProfile('u1', { firstName: 'John', lastName: 'Doe' });

      expect(prisma.userProfile.create).toHaveBeenCalled();
      expect(userUpdateSpy).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: { role: Role.OWNER },
      });
    });

    it('transitions to KYC_PENDING if phone is already verified', async () => {
      jest.spyOn(prisma.userProfile, 'findUnique').mockResolvedValue(null);
      jest.spyOn(prisma.userProfile, 'create').mockResolvedValue({
        id: 'p1',
        ownerState: OwnerState.PROFILE_PENDING,
      } as any);
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        id: 'u1',
        role: Role.OWNER,
        isPhoneVerified: true,
      } as any);
      const profileUpdateSpy = jest
        .spyOn(prisma.userProfile, 'update')
        .mockResolvedValue({} as any);

      await service.upsertProfile('u1', { firstName: 'John', lastName: 'Doe' });

      expect(profileUpdateSpy).toHaveBeenCalledWith({
        where: { userId: 'u1' },
        data: { ownerState: OwnerState.KYC_PENDING },
      });
    });
  });

  describe('transitionState', () => {
    it('throws if profile not found', async () => {
      jest.spyOn(prisma.userProfile, 'findUnique').mockResolvedValue(null);
      await expect(
        service.transitionState('u1', OwnerState.VERIFIED),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws if restricted state is missing reason', async () => {
      jest.spyOn(prisma.userProfile, 'findUnique').mockResolvedValue({} as any);
      await expect(
        service.transitionState('u1', OwnerState.REJECTED),
      ).rejects.toThrow(/requires a reason/);
    });

    it('allows valid transition and audits', async () => {
      jest.spyOn(prisma.userProfile, 'findUnique').mockResolvedValue({} as any);
      const updateSpy = jest
        .spyOn(prisma.userProfile, 'update')
        .mockResolvedValue({} as any);

      await service.transitionState(
        'u1',
        OwnerState.REJECTED,
        'Fraud match',
        'admin-1',
      );

      expect(audit.log).toHaveBeenCalledWith(
        prisma,
        expect.objectContaining({
          actorId: 'admin-1',
          action: 'OWNER_STATE_REJECTED',
          reason: 'Fraud match',
        }),
      );
      expect(updateSpy).toHaveBeenCalledWith({
        where: { userId: 'u1' },
        data: { ownerState: OwnerState.REJECTED },
      });
    });
  });
});
