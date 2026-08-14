import { Test, TestingModule } from '@nestjs/testing';
import { BankService } from './bank.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { SandboxBankProvider } from './providers/sandbox-bank.provider';
import { AuditService } from '../common/audit/audit.service';
import { OwnerProfileService } from '../owner-profile/owner-profile.service';
import { VerificationStatus } from '@prisma/client';
import { BadRequestException } from '@nestjs/common';

describe('BankService', () => {
  let service: BankService;
  let prisma: PrismaService;
  let provider: SandboxBankProvider;
  let audit: AuditService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BankService,
        {
          provide: PrismaService,
          useValue: {
            $transaction: jest.fn().mockImplementation((cb) => cb(prisma)),
            user: {
              findUnique: jest.fn(),
            },
            ownerBankAccount: {
              create: jest.fn(),
              updateMany: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
            },
          },
        },
        {
          provide: SandboxBankProvider,
          useValue: {
            verifyBankAccount: jest.fn(),
          },
        },
        {
          provide: AuditService,
          useValue: {
            log: jest.fn(),
          },
        },
        {
          provide: OwnerProfileService,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<BankService>(BankService);
    prisma = module.get<PrismaService>(PrismaService);
    provider = module.get<SandboxBankProvider>(SandboxBankProvider);
    audit = module.get<AuditService>(AuditService);
  });

  describe('addBankAccount', () => {
    it('throws if profile not found', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);
      await expect(
        service.addBankAccount('u1', { accountNumber: '123', ifsc: 'ABC' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('adds VERIFIED account when exact match', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        profile: { firstName: 'John', lastName: 'Doe' },
      } as any);
      jest.spyOn(provider, 'verifyBankAccount').mockResolvedValue({
        reference: 'ref',
        status: 'SUCCESS',
        beneficiaryName: 'John Doe',
      });
      const createSpy = jest
        .spyOn(prisma.ownerBankAccount, 'create')
        .mockResolvedValue({ id: 'acc1' } as any);
      jest
        .spyOn(prisma.ownerBankAccount, 'updateMany')
        .mockResolvedValue({} as any);

      await service.addBankAccount('u1', { accountNumber: '123', ifsc: 'ABC' });

      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: VerificationStatus.VERIFIED,
            isPrimary: true,
          }),
        }),
      );
      expect(audit.log).toHaveBeenCalled();
    });

    it('adds NEEDS_REVIEW account on name mismatch', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        profile: { firstName: 'John', lastName: 'Doe' },
      } as any);
      jest.spyOn(provider, 'verifyBankAccount').mockResolvedValue({
        reference: 'ref',
        status: 'SUCCESS',
        beneficiaryName: 'Jane Doe',
      });
      const createSpy = jest
        .spyOn(prisma.ownerBankAccount, 'create')
        .mockResolvedValue({ id: 'acc1' } as any);
      jest
        .spyOn(prisma.ownerBankAccount, 'updateMany')
        .mockResolvedValue({} as any);

      await service.addBankAccount('u1', { accountNumber: '123', ifsc: 'ABC' });

      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: VerificationStatus.NEEDS_REVIEW,
            reviewerDecision: 'NAME_MISMATCH',
          }),
        }),
      );
      // Should not log the VERIFIED event
      expect(audit.log).not.toHaveBeenCalled();
    });
  });

  describe('submitReviewerDecision', () => {
    it('allows reviewer to manually approve mismatch', async () => {
      jest.spyOn(prisma.ownerBankAccount, 'findUnique').mockResolvedValue({
        id: 'acc1',
        status: VerificationStatus.NEEDS_REVIEW,
      } as any);
      const updateSpy = jest
        .spyOn(prisma.ownerBankAccount, 'update')
        .mockResolvedValue({} as any);

      await service.submitReviewerDecision(
        'acc1',
        'rev1',
        'APPROVED',
        'Looks like a typo',
      );

      expect(updateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: VerificationStatus.VERIFIED,
            reviewerDecision: 'MANUAL_APPROVED',
          }),
        }),
      );
      expect(audit.log).toHaveBeenCalledWith(
        prisma,
        expect.objectContaining({
          action: 'BANK_ACCOUNT_VERIFIED',
          reason: 'Looks like a typo',
        }),
      );
    });
  });
});
