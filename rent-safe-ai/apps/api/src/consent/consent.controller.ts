import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ConsentService } from './consent.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { IsString, IsNotEmpty } from 'class-validator';

export class ConsentDto {
  @IsString()
  @IsNotEmpty()
  policyVersion: string;

  @IsString()
  @IsNotEmpty()
  purpose: string;
}

export class WithdrawConsentDto {
  @IsString()
  @IsNotEmpty()
  purpose: string;
}

@Controller('consent')
@UseGuards(JwtAuthGuard)
export class ConsentController {
  constructor(private readonly consentService: ConsentService) {}

  @Post('record')
  @HttpCode(HttpStatus.CREATED)
  async recordConsent(@Request() req, @Body() dto: ConsentDto) {
    return this.consentService.recordConsent(
      req.user.userId,
      dto.policyVersion,
      dto.purpose,
    );
  }

  @Post('withdraw')
  @HttpCode(HttpStatus.OK)
  async withdrawConsent(@Request() req, @Body() dto: WithdrawConsentDto) {
    return this.consentService.withdrawConsent(req.user.userId, dto.purpose);
  }
}
