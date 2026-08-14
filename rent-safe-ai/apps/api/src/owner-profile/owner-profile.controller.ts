import {
  Controller,
  Get,
  Put,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { OwnerProfileService } from './owner-profile.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { OwnerState } from '@prisma/client';

export class UpdateProfileDto {
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsString()
  @IsOptional()
  displayName?: string;
}

@Controller('owner')
@UseGuards(JwtAuthGuard)
export class OwnerProfileController {
  constructor(private readonly ownerProfileService: OwnerProfileService) {}

  @Get('checklist')
  async getChecklist(@Request() req: any) {
    return this.ownerProfileService.getChecklist(req.user.userId);
  }

  @Put('profile')
  async upsertProfile(@Request() req: any, @Body() dto: UpdateProfileDto) {
    return this.ownerProfileService.upsertProfile(req.user.userId, dto);
  }
}
