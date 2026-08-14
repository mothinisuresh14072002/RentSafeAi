import { Injectable, BadRequestException, UnauthorizedException, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../common/prisma/prisma.service';
import { LocalOtpProvider } from './providers/local-otp.provider';
import { CryptoUtil } from '../common/utils/crypto.util';
import parsePhoneNumberFromString from 'libphonenumber-js';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly otpProvider: LocalOtpProvider,
    private readonly jwtService: JwtService,
  ) {}

  private normalizePhone(phone: string): string {
    const phoneNumber = parsePhoneNumberFromString(phone, 'IN');
    if (!phoneNumber || !phoneNumber.isValid()) {
      throw new BadRequestException('Invalid phone number format');
    }
    return phoneNumber.number as string;
  }

  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async requestOtp(rawPhone: string): Promise<{ success: boolean }> {
    const phone = this.normalizePhone(rawPhone);

    // Check cooldown (60 seconds)
    const recentOtp = await this.prisma.otpAttempt.findFirst({
      where: { phone },
      orderBy: { createdAt: 'desc' },
    });

    if (recentOtp) {
      const secondsSinceLast = (Date.now() - recentOtp.createdAt.getTime()) / 1000;
      if (secondsSinceLast < 60) {
        throw new BadRequestException(`Please wait ${Math.ceil(60 - secondsSinceLast)} seconds before requesting a new OTP.`);
      }
    }

    const code = this.generateOtp();
    const codeHash = await CryptoUtil.hash(code);

    await this.prisma.$transaction(async (tx) => {
      await tx.otpAttempt.create({
        data: {
          phone,
          codeHash,
          expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes expiry
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: 'SYSTEM',
          action: 'OTP_REQUESTED',
          entityType: 'OTP_ATTEMPT',
          entityId: phone, // Log the phone, not the OTP
        },
      });
    });

    // Send OTP via Provider
    await this.otpProvider.sendOtp(phone, code);

    return { success: true };
  }

  async verifyOtp(rawPhone: string, code: string): Promise<{ success: boolean; message: string }> {
    const phone = this.normalizePhone(rawPhone);

    const otpAttempt = await this.prisma.otpAttempt.findFirst({
      where: { phone, verified: false },
      orderBy: { createdAt: 'desc' },
    });

    if (!otpAttempt) {
      throw new BadRequestException('No active OTP request found for this phone number');
    }

    if (otpAttempt.expiresAt < new Date()) {
      throw new BadRequestException('OTP has expired');
    }

    if (otpAttempt.attempts >= 3) {
      throw new BadRequestException('Maximum attempts exceeded. Please request a new OTP.');
    }

    const isValid = await CryptoUtil.compare(code, otpAttempt.codeHash);

    if (!isValid) {
      await this.prisma.otpAttempt.update({
        where: { id: otpAttempt.id },
        data: { attempts: { increment: 1 } },
      });

      await this.prisma.auditLog.create({
        data: {
          actorId: 'SYSTEM',
          action: 'OTP_VERIFY_FAILED',
          entityType: 'OTP_ATTEMPT',
          entityId: phone,
        },
      });

      throw new BadRequestException('Invalid OTP code');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.otpAttempt.update({
        where: { id: otpAttempt.id },
        data: { verified: true },
      });

      await tx.auditLog.create({
        data: {
          actorId: 'SYSTEM',
          action: 'OTP_VERIFY_SUCCESS',
          entityType: 'OTP_ATTEMPT',
          entityId: phone,
        },
      });
    });

    // Find or create user
    let user = await this.prisma.user.findUnique({ where: { phone } });
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          phone,
          // Placeholder email since it's required in schema, but we only have phone right now
          // We can assign a dummy or require email later. Wait, schema requires email!
          email: `${phone}@temp.rentsafe.in`,
          hashedPassword: 'PASSWORDLESS',
          isPhoneVerified: true,
        },
      });
    } else {
      if (user.status !== 'ACTIVE') {
        throw new UnauthorizedException('User account is not active');
      }
    }

    return this.createSession(user.id);
  }

  private async createSession(userId: string) {
    const familyId = crypto.randomUUID();
    const nonce = crypto.randomUUID();
    const refreshTokenHash = await CryptoUtil.hash(nonce);

    await this.prisma.session.create({
      data: {
        userId,
        familyId,
        refreshTokenHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    const accessToken = this.jwtService.sign({ sub: userId });
    return {
      accessToken,
      refreshToken: `${familyId}:${nonce}`,
    };
  }

  async refreshToken(token: string) {
    const [familyId, nonce] = token.split(':');
    if (!familyId || !nonce) {
      throw new UnauthorizedException('Invalid refresh token format');
    }

    const session = await this.prisma.session.findFirst({
      where: { familyId },
      orderBy: { createdAt: 'desc' },
    });

    if (!session) {
      throw new UnauthorizedException('Session not found');
    }

    if (session.status !== 'ACTIVE' || session.expiresAt < new Date()) {
      throw new UnauthorizedException('Session expired or revoked');
    }

    const isValid = await CryptoUtil.compare(nonce, session.refreshTokenHash);

    if (!isValid) {
      // REUSE DETECTED! Revoke family
      await this.prisma.session.updateMany({
        where: { familyId },
        data: { status: 'REVOKED' },
      });
      await this.prisma.auditLog.create({
        data: {
          actorId: session.userId,
          action: 'REFRESH_TOKEN_REUSE_DETECTED',
          entityType: 'SESSION',
          entityId: familyId,
        },
      });
      throw new UnauthorizedException('Refresh token reuse detected. Session revoked.');
    }

    // Valid: rotate token
    const newNonce = crypto.randomUUID();
    const newHash = await CryptoUtil.hash(newNonce);

    await this.prisma.session.update({
      where: { id: session.id },
      data: { refreshTokenHash: newHash },
    });

    const accessToken = this.jwtService.sign({ sub: session.userId });
    return {
      accessToken,
      refreshToken: `${familyId}:${newNonce}`,
    };
  }

  async logout(userId: string, familyId: string) {
    await this.prisma.session.updateMany({
      where: { userId, familyId },
      data: { status: 'REVOKED' },
    });
  }

  async logoutAll(userId: string) {
    await this.prisma.session.updateMany({
      where: { userId, status: 'ACTIVE' },
      data: { status: 'REVOKED' },
    });
  }
}
