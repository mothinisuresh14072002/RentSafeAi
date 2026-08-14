import {
  Injectable,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { GeoUtil } from '../common/utils/geo.util';
import { Policies } from '../auth/policies';
import { AuditService } from '../common/audit/audit.service';
import { VerificationStatus } from '@prisma/client';

const PHRASES = [
  'BLUE SKY',
  'RED APPLE',
  'GREEN LEAF',
  'YELLOW SUN',
  'WHITE CLOUD',
  'RAISE RIGHT HAND',
  'TOUCH NOSE',
  'HOLD UP TWO FINGERS',
];

export interface SubmitChallengeDto {
  latitude: number;
  longitude: number;
  mediaKey: string;
}

@Injectable()
export class PresenceService {
  private readonly MAX_DISTANCE_METERS = 200;

  constructor(
    private readonly prisma: PrismaService,
    private readonly policies: Policies,
    private readonly auditService: AuditService,
  ) {}

  async generateChallenge(userId: string, propertyId: string) {
    await this.policies.canAccessPropertyEvidence(userId, propertyId);

    // Expire any existing PENDING challenges
    await this.prisma.presenceChallenge.updateMany({
      where: { propertyId, status: VerificationStatus.PENDING },
      data: { status: VerificationStatus.EXPIRED },
    });

    const phrase = PHRASES[Math.floor(Math.random() * PHRASES.length)];
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    return this.prisma.presenceChallenge.create({
      data: {
        propertyId,
        phrase,
        expiresAt,
        status: VerificationStatus.PENDING,
      },
    });
  }

  async submitChallenge(
    userId: string,
    propertyId: string,
    challengeId: string,
    dto: SubmitChallengeDto,
  ) {
    await this.policies.canAccessPropertyEvidence(userId, propertyId);

    return this.prisma.$transaction(async (tx) => {
      const challenge = await tx.presenceChallenge.findUnique({
        where: { id: challengeId },
        include: { property: true },
      });

      if (!challenge || challenge.propertyId !== propertyId) {
        throw new BadRequestException('Challenge not found');
      }

      if (challenge.status !== VerificationStatus.PENDING) {
        throw new BadRequestException('Challenge is no longer active');
      }

      if (challenge.expiresAt < new Date()) {
        await tx.presenceChallenge.update({
          where: { id: challengeId },
          data: { status: VerificationStatus.EXPIRED },
        });
        throw new BadRequestException('Challenge has expired');
      }

      const propLat = challenge.property.latitude;
      const propLng = challenge.property.longitude;

      if (!propLat || !propLng) {
        throw new BadRequestException('Property coordinates are not available');
      }

      const distance = GeoUtil.calculateDistance(
        propLat,
        propLng,
        dto.latitude,
        dto.longitude,
      );

      if (distance > this.MAX_DISTANCE_METERS) {
        await tx.presenceChallenge.update({
          where: { id: challengeId },
          data: {
            status: VerificationStatus.REJECTED,
            submittedLat: dto.latitude,
            submittedLng: dto.longitude,
          },
        });
        throw new BadRequestException(
          `Geographic bounds exceeded. Distance: ${Math.round(distance)}m (Max: ${this.MAX_DISTANCE_METERS}m)`,
        );
      }

      // Success - create PropertyVerification entry
      await tx.presenceChallenge.update({
        where: { id: challengeId },
        data: {
          status: VerificationStatus.VERIFIED,
          submittedLat: dto.latitude,
          submittedLng: dto.longitude,
          mediaKey: dto.mediaKey,
        },
      });

      await tx.propertyVerification.create({
        data: {
          propertyId,
          checkType: 'PRESENCE_PROOF',
          evidenceReference: dto.mediaKey,
          status: VerificationStatus.PENDING, // Needs human review to check video/photo
        },
      });

      await this.auditService.log(tx, {
        actorId: userId,
        action: 'PRESENCE_CHALLENGE_SUBMITTED',
        entityType: 'PROPERTY',
        entityId: propertyId,
      });

      return { success: true };
    });
  }
}
