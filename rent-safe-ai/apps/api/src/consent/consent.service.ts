import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class ConsentService {
  constructor(private readonly prisma: PrismaService) {}

  async recordConsent(userId: string, policyVersion: string, purpose: string) {
    if (!policyVersion || !purpose) {
      throw new BadRequestException('Policy version and purpose are required');
    }
    return this.prisma.consent.create({
      data: {
        userId,
        policyVersion,
        purpose,
      },
    });
  }

  async withdrawConsent(userId: string, purpose: string) {
    const consent = await this.prisma.consent.findFirst({
      where: { userId, purpose, withdrawalTimestamp: null },
      orderBy: { createdAt: 'desc' },
    });

    if (!consent) {
      throw new BadRequestException('Active consent not found for this purpose');
    }

    return this.prisma.consent.update({
      where: { id: consent.id },
      data: { withdrawalTimestamp: new Date() },
    });
  }

  async hasActiveConsent(userId: string, purpose: string) {
    const consent = await this.prisma.consent.findFirst({
      where: { userId, purpose },
      orderBy: { createdAt: 'desc' },
    });
    return consent && consent.withdrawalTimestamp === null;
  }
}
