import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { OwnershipVerificationService } from './ownership-verification.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';
import { PrismaService } from '../common/prisma/prisma.service';

export interface VerifyOwnershipDto {
  documentId: string;
  registryReference: string;
}

@Controller('property')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('OWNER')
export class OwnershipVerificationController {
  constructor(
    private readonly verificationService: OwnershipVerificationService,
    private readonly prisma: PrismaService,
  ) {}

  @Post(':id/ownership/verify')
  async verifyOwnership(
    @Request() req: any,
    @Param('id') propertyId: string,
    @Body() dto: VerifyOwnershipDto,
  ) {
    return this.verificationService.verifyOwnership(
      req.user.userId,
      propertyId,
      dto.documentId,
      dto.registryReference,
    );
  }

  @Get(':id/ownership')
  async getOwnershipVerificationStatus(
    @Request() req: any,
    @Param('id') propertyId: string,
  ) {
    // Basic auth check
    await this.prisma.property.findFirstOrThrow({
      where: { id: propertyId, ownerId: req.user.userId },
    });
    return this.verificationService.getVerificationStatus(
      this.prisma,
      propertyId,
    );
  }
}
