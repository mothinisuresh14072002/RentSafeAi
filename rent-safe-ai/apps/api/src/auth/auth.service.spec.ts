import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { LocalOtpProvider } from './providers/local-otp.provider';
import { BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { CryptoUtil } from '../common/utils/crypto.util';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;
  let otpProvider: LocalOtpProvider;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: {
            otpAttempt: {
              findFirst: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
            },
            session: {
              findFirst: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              updateMany: jest.fn(),
            },
            user: {
              findUnique: jest.fn(),
              create: jest.fn(),
            },
            auditLog: {
              create: jest.fn(),
            },
            $transaction: jest.fn().mockImplementation((cb) => cb(prisma)),
          },
        },
        {
          provide: LocalOtpProvider,
          useValue: {
            sendOtp: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('mock-jwt-token'),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
    otpProvider = module.get<LocalOtpProvider>(LocalOtpProvider);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('requestOtp', () => {
    it('should throw error on invalid phone format', async () => {
      await expect(service.requestOtp('invalid')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should enforce cooldown', async () => {
      jest.spyOn(prisma.otpAttempt, 'findFirst').mockResolvedValue({
        id: '1',
        phone: '+919999999999',
        email: null,
        codeHash: 'hash',
        attempts: 0,
        verified: false,
        expiresAt: new Date(Date.now() + 50000),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(service.requestOtp('+919999999999')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should generate and send OTP', async () => {
      jest.spyOn(prisma.otpAttempt, 'findFirst').mockResolvedValue(null);
      const createSpy = jest
        .spyOn(prisma.otpAttempt, 'create')
        .mockResolvedValue(null as any);

      const res = await service.requestOtp('+919999999999');
      expect(res.success).toBe(true);
      expect(createSpy).toHaveBeenCalled();
      expect(otpProvider.sendOtp).toHaveBeenCalled();
    });
  });

  describe('verifyOtp', () => {
    it('should fail if no active OTP found', async () => {
      jest.spyOn(prisma.otpAttempt, 'findFirst').mockResolvedValue(null);
      await expect(
        service.verifyOtp('+919999999999', '123456'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should fail if expired', async () => {
      jest.spyOn(prisma.otpAttempt, 'findFirst').mockResolvedValue({
        id: '1',
        phone: '+919999999999',
        email: null,
        codeHash: 'hash',
        attempts: 0,
        verified: false,
        expiresAt: new Date(Date.now() - 50000),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await expect(
        service.verifyOtp('+919999999999', '123456'),
      ).rejects.toThrow(/expired/);
    });

    it('should fail if max attempts exceeded', async () => {
      jest.spyOn(prisma.otpAttempt, 'findFirst').mockResolvedValue({
        id: '1',
        phone: '+919999999999',
        email: null,
        codeHash: 'hash',
        attempts: 3,
        verified: false,
        expiresAt: new Date(Date.now() + 50000),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await expect(
        service.verifyOtp('+919999999999', '123456'),
      ).rejects.toThrow(/Maximum attempts/);
    });

    it('should successfully verify a correct code', async () => {
      const code = '123456';
      const hash = await CryptoUtil.hash(code);
      jest.spyOn(prisma.otpAttempt, 'findFirst').mockResolvedValue({
        id: '1',
        phone: '+919999999999',
        email: null,
        codeHash: hash,
        attempts: 0,
        verified: false,
        expiresAt: new Date(Date.now() + 50000),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const updateSpy = jest
        .spyOn(prisma.otpAttempt, 'update')
        .mockResolvedValue(null as any);
      jest
        .spyOn(prisma.user, 'findUnique')
        .mockResolvedValue({ id: 'u1', status: 'ACTIVE' } as any);
      jest.spyOn(prisma.session, 'create').mockResolvedValue(null as any);

      const res = await service.verifyOtp('+919999999999', code);
      expect(res.accessToken).toBe('mock-jwt-token');
      expect(updateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ data: { verified: true } }),
      );
    });
  });

  describe('refreshToken', () => {
    it('should throw if session not found', async () => {
      jest.spyOn(prisma.session, 'findFirst').mockResolvedValue(null);
      await expect(service.refreshToken('family:nonce')).rejects.toThrow(
        /Session not found/,
      );
    });

    it('should detect reuse and revoke family', async () => {
      const code = 'nonce';
      // Mismatched hash
      const hash = await CryptoUtil.hash('different-nonce');
      jest.spyOn(prisma.session, 'findFirst').mockResolvedValue({
        id: '1',
        userId: 'u1',
        familyId: 'family',
        refreshTokenHash: hash,
        deviceId: null,
        status: 'ACTIVE',
        expiresAt: new Date(Date.now() + 50000),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const updateManySpy = jest
        .spyOn(prisma.session, 'updateMany')
        .mockResolvedValue(null as any);

      await expect(service.refreshToken('family:nonce')).rejects.toThrow(
        /Refresh token reuse/,
      );
      expect(updateManySpy).toHaveBeenCalledWith({
        where: { familyId: 'family' },
        data: { status: 'REVOKED' },
      });
    });

    it('should rotate token if valid', async () => {
      const nonce = 'valid-nonce';
      const hash = await CryptoUtil.hash(nonce);
      jest.spyOn(prisma.session, 'findFirst').mockResolvedValue({
        id: '1',
        userId: 'u1',
        familyId: 'family',
        refreshTokenHash: hash,
        deviceId: null,
        status: 'ACTIVE',
        expiresAt: new Date(Date.now() + 50000),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const updateSpy = jest
        .spyOn(prisma.session, 'update')
        .mockResolvedValue(null as any);

      const res = await service.refreshToken(`family:${nonce}`);
      expect(res.accessToken).toBe('mock-jwt-token');
      expect(res.refreshToken).toMatch(/^family:/);
      expect(updateSpy).toHaveBeenCalled();
    });
  });
});
