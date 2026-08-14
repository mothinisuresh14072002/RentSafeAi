import { Test, TestingModule } from '@nestjs/testing';
import { ReviewService } from './review.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { ReviewState, VerificationStatus } from '@prisma/client';
import { BadRequestException } from '@nestjs/common';
import { MANDATORY_CHECKS } from './constants';

describe('ReviewService', () => {
  let service: ReviewService;
  let prisma: PrismaService;
  let audit: AuditService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewService,
        {
          provide: PrismaService,
          useValue: {
            $transaction: jest.fn().mockImplementation((cb) => cb(prisma)),
            reviewCase: {
              findUnique: jest.fn(),
              update: jest.fn(),
              create: jest.fn(),
              findFirst: jest.fn(),
            },
            reviewAction: {
              create: jest.fn(),
            },
            propertyVerification: {
              findMany: jest.fn(),
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

    service = module.get<ReviewService>(ReviewService);
    prisma = module.get<PrismaService>(PrismaService);
    audit = module.get<AuditService>(AuditService);
  });

  describe('approve', () => {
    it('throws if any mandatory checks are missing or not verified', async () => {
      jest.spyOn(prisma.reviewCase, 'findUnique').mockResolvedValue({
        id: 'case1',
        targetId: 'prop1',
      } as any);

      // Return only 1 verified check, meaning 9 are missing
      jest.spyOn(prisma.propertyVerification, 'findMany').mockResolvedValue([
        {
          checkType: 'IDENTITY_KYC',
          status: VerificationStatus.VERIFIED,
        } as any,
      ]);

      await expect(
        service.approve('case1', 'reviewer1', 'Looks good'),
      ).rejects.toThrow(BadRequestException);
    });

    it('approves if all mandatory checks are verified', async () => {
      jest.spyOn(prisma.reviewCase, 'findUnique').mockResolvedValue({
        id: 'case1',
        targetId: 'prop1',
      } as any);

      const verifications = MANDATORY_CHECKS.map((check) => ({
        checkType: check,
        status: VerificationStatus.VERIFIED,
      }));

      jest
        .spyOn(prisma.propertyVerification, 'findMany')
        .mockResolvedValue(verifications as any);
      const updateCaseSpy = jest
        .spyOn(prisma.reviewCase, 'update')
        .mockResolvedValue({} as any);

      await service.approve('case1', 'reviewer1', 'Looks perfect');

      expect(updateCaseSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: ReviewState.APPROVED },
        }),
      );
      expect(prisma.reviewAction.create).toHaveBeenCalled();
      expect(audit.log).toHaveBeenCalled();
    });
  });

  describe('reject', () => {
    it('rejects successfully regardless of checks', async () => {
      const updateCaseSpy = jest
        .spyOn(prisma.reviewCase, 'update')
        .mockResolvedValue({} as any);

      await service.reject('case1', 'reviewer1', 'Suspicious');

      expect(updateCaseSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: ReviewState.REJECTED },
        }),
      );
      expect(prisma.reviewAction.create).toHaveBeenCalled();
    });
  });
});
