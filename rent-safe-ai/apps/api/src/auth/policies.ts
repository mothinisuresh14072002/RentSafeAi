import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { OwnerState } from '@prisma/client';

@Injectable()
export class Policies {
  constructor(private readonly prisma: PrismaService) {}

  async requirePropertyOwnership(userId: string, propertyId: string) {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
      select: { ownerId: true },
    });

    if (!property) {
      throw new ForbiddenException('Resource not found or access denied');
    }

    if (property.ownerId !== userId) {
      throw new ForbiddenException('Resource not found or access denied');
    }
  }

  async canSubmitProperty(userId: string) {
    const profile = await this.prisma.userProfile.findUnique({
      where: { userId },
      select: { ownerState: true },
    });

    if (!profile || profile.ownerState !== OwnerState.VERIFIED) {
      throw new ForbiddenException(
        'Owner verification is required before submitting properties',
      );
    }
  }

  async canAccessPropertyEvidence(userId: string, propertyId: string) {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
      select: { ownerId: true },
    });

    if (!property || property.ownerId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to access this property evidence.',
      );
    }

    return true;
  }
}
