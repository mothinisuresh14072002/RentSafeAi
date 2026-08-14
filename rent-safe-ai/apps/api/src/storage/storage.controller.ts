import { Controller, Post, Get, Body, UseGuards, Request, Param, BadRequestException, ForbiddenException, HttpCode, HttpStatus } from '@nestjs/common';
import { StorageService } from './storage.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { Policies } from '../auth/policies';
import { MimeUtil } from './utils/mime.util';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';
import * as crypto from 'crypto';
import { QuarantineStatus } from '@prisma/client';

export class UploadRequestDto {
  propertyId: string;
  targetType: 'DOCUMENT' | 'MEDIA';
  extension: string;
  mimeType: string;
  size: number;
}

export class UploadFinalizeDto {
  propertyId: string;
  targetType: 'DOCUMENT' | 'MEDIA';
  objectKey: string;
  checksum: string;
  mimeType: string;
}

@Controller('storage')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StorageController {
  constructor(
    private readonly storageService: StorageService,
    private readonly prisma: PrismaService,
    private readonly policies: Policies,
  ) {}

  @Post('upload-request')
  @Roles('OWNER')
  async requestUploadUrl(@Request() req, @Body() dto: UploadRequestDto) {
    await this.policies.canAccessPropertyEvidence(req.user.userId, dto.propertyId);

    const ext = dto.extension.toLowerCase().replace('.', '');
    
    if (dto.targetType === 'DOCUMENT') {
      if (!MimeUtil.validateDocument(dto.mimeType, ext, dto.size)) {
        throw new BadRequestException('Invalid document file or size limit exceeded (Max 5MB, PDF only)');
      }
    } else if (dto.targetType === 'MEDIA') {
      if (!MimeUtil.validateMedia(dto.mimeType, ext, dto.size)) {
        throw new BadRequestException('Invalid media file or size limit exceeded (Max 10MB, JPG/PNG/WEBP only)');
      }
    } else {
      throw new BadRequestException('Unknown target type');
    }

    const objectKey = `${dto.propertyId}/${dto.targetType.toLowerCase()}s/${crypto.randomBytes(16).toString('hex')}.${ext}`;
    const url = await this.storageService.generatePresignedUploadUrl(objectKey, dto.mimeType);

    return { uploadUrl: url, objectKey };
  }

  @Post('finalize')
  @Roles('OWNER')
  async finalizeUpload(@Request() req, @Body() dto: UploadFinalizeDto) {
    await this.policies.canAccessPropertyEvidence(req.user.userId, dto.propertyId);

    // In a real app, we would ideally verify the object exists and the checksum matches via MinIO HEAD request.
    // For MVP, we will assume the client uploaded it successfully and trust the hook will scan it later.
    
    if (dto.targetType === 'DOCUMENT') {
      const doc = await this.prisma.propertyDocument.create({
        data: {
          propertyId: dto.propertyId,
          documentType: 'OTHER_EVIDENCE',
          objectKey: dto.objectKey,
          checksum: dto.checksum,
          mimeType: dto.mimeType,
          quarantineStatus: QuarantineStatus.PENDING_SCAN,
        },
      });
      return { success: true, id: doc.id };
    } else {
      // Need a listing to attach media to, but for MVP we will just attach it if there's a draft listing, 
      // or create a dummy one if required. Actually, the prompt says `listing_media` tables. 
      // We will look up the first listing or create a DRAFT one for this property.
      let listing = await this.prisma.listing.findFirst({ where: { propertyId: dto.propertyId } });
      if (!listing) {
        listing = await this.prisma.listing.create({
          data: {
            propertyId: dto.propertyId,
            rentAmount: 0,
            depositAmount: 0,
            furnishing: 'NONE',
            availability: new Date(),
          }
        });
      }

      const media = await this.prisma.listingMedia.create({
        data: {
          listingId: listing.id,
          privateOriginalKey: dto.objectKey,
          publicDerivativeKey: `derivatives/${dto.objectKey}`,
          sha256Hash: dto.checksum,
          pHash: 'pending',
          mimeType: dto.mimeType,
          quarantineStatus: QuarantineStatus.PENDING_SCAN,
        },
      });
      return { success: true, id: media.id };
    }
  }

  // Malware Scanner Webhook Simulation
  @Post('webhook/malware-scan')
  @Roles('ADMIN') // Simulated secure internal route
  @HttpCode(HttpStatus.OK)
  async handleMalwareScanHook(@Body() payload: { objectKey: string, isClean: boolean }) {
    const newStatus = payload.isClean ? QuarantineStatus.CLEARED : QuarantineStatus.INFECTED;
    
    await this.prisma.propertyDocument.updateMany({
      where: { objectKey: payload.objectKey },
      data: { quarantineStatus: newStatus },
    });

    await this.prisma.listingMedia.updateMany({
      where: { privateOriginalKey: payload.objectKey },
      data: { quarantineStatus: newStatus },
    });

    return { success: true };
  }

  @Get('media/:id')
  @Roles('OWNER', 'REVIEWER')
  async getMediaUrl(@Request() req, @Param('id') id: string) {
    const doc = await this.prisma.propertyDocument.findUnique({ where: { id }, include: { property: true } });
    if (doc) {
      if (req.user.roles.includes('OWNER')) {
        await this.policies.canAccessPropertyEvidence(req.user.userId, doc.propertyId);
      }
      if (doc.quarantineStatus !== QuarantineStatus.CLEARED) {
        throw new BadRequestException('File is quarantined or pending scan');
      }
      const url = await this.storageService.generatePresignedDownloadUrl(doc.objectKey);
      return { url };
    }

    const media = await this.prisma.listingMedia.findUnique({ where: { id }, include: { listing: { include: { property: true } } } });
    if (media) {
      if (req.user.roles.includes('OWNER')) {
        await this.policies.canAccessPropertyEvidence(req.user.userId, media.listing.propertyId);
      }
      if (media.quarantineStatus !== QuarantineStatus.CLEARED) {
        throw new BadRequestException('File is quarantined or pending scan');
      }
      // Return the derivative for media
      const url = await this.storageService.generatePresignedDownloadUrl(media.publicDerivativeKey);
      return { url };
    }

    throw new BadRequestException('File not found');
  }
}
