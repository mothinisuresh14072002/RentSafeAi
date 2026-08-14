import {
  Controller,
  Get,
  Param,
  UseGuards,
  Query,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';

@Controller('fraud')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('REVIEWER', 'ADMIN')
export class FraudController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
  ) {}

  @Get('signals')
  async getSignals(
    @Query('skip') skip: number = 0,
    @Query('take') take: number = 20,
  ) {
    const signals = await this.prisma.riskSignal.findMany({
      skip: Number(skip),
      take: Number(take),
      orderBy: { createdAt: 'desc' },
    });
    return { data: signals };
  }

  @Get('compare/media/:signalId')
  async getMediaComparison(@Param('signalId') signalId: string) {
    const signal = await this.prisma.riskSignal.findUnique({
      where: { id: signalId },
    });
    if (!signal) {
      throw new NotFoundException('Signal not found');
    }

    const evidence = signal.evidenceJson as any;
    if (evidence?.entityType !== 'LISTING_MEDIA') {
      throw new NotFoundException('Signal is not a media duplicate type');
    }

    const media1 = await this.prisma.listingMedia.findUnique({
      where: { id: evidence.entityId },
    });
    const media2 = await this.prisma.listingMedia.findUnique({
      where: { id: evidence.matchedEntityId },
    });

    if (!media1 || !media2) {
      throw new NotFoundException('Source media not found');
    }

    const url1 = await this.storageService.generatePresignedDownloadUrl(
      media1.privateOriginalKey,
    );
    const url2 = await this.storageService.generatePresignedDownloadUrl(
      media2.privateOriginalKey,
    );

    return {
      similarityScore: evidence.similarityScore,
      ruleCode: signal.ruleCode,
      media1: { id: media1.id, url: url1, listingId: media1.listingId },
      media2: { id: media2.id, url: url2, listingId: media2.listingId },
    };
  }
}
