import { Test, TestingModule } from '@nestjs/testing';
import { KycService } from './kyc.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { SandboxKycProvider } from './providers/sandbox.provider';
import { OwnerProfileService } from '../owner-profile/owner-profile.service';
import { AuditService } from '../common/audit/audit.service';
import { VerificationStatus, OwnerState } from '@prisma/client';
import { BadRequestException } from '@nestjs/common';

describe('KycService', () => {
  let service: KycService;
  let prisma: PrismaService;
  let provider: SandboxKycProvider;
  let audit: AuditService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KycService,
        {
          provide: PrismaService,
          useValue: {
            $transaction: jest.fn().mockImplementation((cb) => cb(prisma)),
            userProfile: {
              findUnique: jest.fn(),
              update: jest.fn(),
            },
            ownerKycCase: {
              create: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
            },
          },
        },
        {
          provide: SandboxKycProvider,
          useValue: {
            initiateVerification: jest.fn().mockResolvedValue('ref1'),
            verifyCallbackSignature: jest.fn(),
          },
        },
        {
          provide: OwnerProfileService,
          useValue: {},
        },
        {
          provide: AuditService,
          useValue: {
            log: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<KycService>(KycService);
    prisma = module.get<PrismaService>(PrismaService);
    provider = module.get<SandboxKycProvider>(SandboxKycProvider);
    audit = module.get<AuditService>(AuditService);
  });

  describe('initiateKyc', () => {
    it('throws if profile not in KYC_PENDING', async () => {
      jest
        .spyOn(prisma.userProfile, 'findUnique')
        .mockResolvedValue({ ownerState: OwnerState.PROFILE_PENDING } as any);
      await expect(service.initiateKyc('u1', {})).rejects.toThrow(
        BadRequestException,
      );
    });

    it('creates KYC case if valid', async () => {
      jest
        .spyOn(prisma.userProfile, 'findUnique')
        .mockResolvedValue({ ownerState: OwnerState.KYC_PENDING } as any);
      const createSpy = jest
        .spyOn(prisma.ownerKycCase, 'create')
        .mockResolvedValue({} as any);

      await service.initiateKyc('u1', {});

      expect(provider.initiateVerification).toHaveBeenCalled();
      expect(createSpy).toHaveBeenCalledWith({
        data: {
          userId: 'u1',
          provider: 'SANDBOX',
          providerReference: 'ref1',
          status: VerificationStatus.PENDING,
        },
      });
    });
  });

  describe('handleWebhook', () => {
    it('throws on invalid signature', async () => {
      jest.spyOn(provider, 'verifyCallbackSignature').mockReturnValue(false);
      await expect(service.handleWebhook('bad_sig', {})).rejects.toThrow(
        /Invalid webhook signature/,
      );
    });

    it('returns early if idempotency check fails (status not PENDING)', async () => {
      jest.spyOn(provider, 'verifyCallbackSignature').mockReturnValue(true);
      jest
        .spyOn(prisma.ownerKycCase, 'findUnique')
        .mockResolvedValue({ status: VerificationStatus.VERIFIED } as any);

      const res = await service.handleWebhook('sig', { reference: 'ref1' });
      expect(res).toEqual({ message: 'Webhook already processed' });
    });

    it('updates correctly on success and masks data', async () => {
      jest.spyOn(provider, 'verifyCallbackSignature').mockReturnValue(true);
      jest.spyOn(prisma.ownerKycCase, 'findUnique').mockResolvedValue({
        id: 'case1',
        userId: 'u1',
        status: VerificationStatus.PENDING,
      } as any);
      const updateKycSpy = jest
        .spyOn(prisma.ownerKycCase, 'update')
        .mockResolvedValue({} as any);
      const updateProfileSpy = jest
        .spyOn(prisma.userProfile, 'update')
        .mockResolvedValue({} as any);

      await service.handleWebhook('sig', {
        reference: 'ref1',
        status: 'SUCCESS',
        data: { rawAadhaar: '123412341234', name: 'John Doe', dob: '1990' },
      });

      expect(updateKycSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'case1' },
          data: expect.objectContaining({
            status: VerificationStatus.VERIFIED,
            normalizedName: 'John Doe',
            maskedResult: {
              name: 'John Doe',
              dob: '1990',
              aadhaar: '********1234',
            },
          }),
        }),
      );

      expect(updateProfileSpy).toHaveBeenCalledWith({
        where: { userId: 'u1' },
        data: { ownerState: OwnerState.VERIFIED },
      });

      expect(audit.log).toHaveBeenCalledWith(
        prisma,
        expect.objectContaining({
          action: 'OWNER_STATE_VERIFIED',
        }),
      );
    });

    it('updates to NEEDS_REVIEW on name mismatch', async () => {
      jest.spyOn(provider, 'verifyCallbackSignature').mockReturnValue(true);
      jest.spyOn(prisma.ownerKycCase, 'findUnique').mockResolvedValue({
        id: 'case1',
        userId: 'u1',
        status: VerificationStatus.PENDING,
      } as any);
      const updateKycSpy = jest
        .spyOn(prisma.ownerKycCase, 'update')
        .mockResolvedValue({} as any);

      await service.handleWebhook('sig', {
        reference: 'ref1',
        status: 'SUCCESS',
        data: {
          rawAadhaar: '123412341234',
          name: 'John Doe (Mismatch)',
          dob: '1990',
        },
      });

      expect(updateKycSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: VerificationStatus.NEEDS_REVIEW,
            reviewerDecision: 'NAME_MISMATCH',
          }),
        }),
      );
    });
  });
});
