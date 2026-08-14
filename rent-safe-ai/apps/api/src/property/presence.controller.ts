import {
  Controller,
  Post,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import type { SubmitChallengeDto } from './presence.service';
import { PresenceService } from './presence.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';

@Controller('property/:id/presence-challenge')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('OWNER')
export class PresenceController {
  constructor(private readonly presenceService: PresenceService) {}

  @Post()
  async generateChallenge(
    @Request() req: any,
    @Param('id') propertyId: string,
  ) {
    return this.presenceService.generateChallenge(req.user.userId, propertyId);
  }

  @Post(':challengeId/submit')
  async submitChallenge(
    @Request() req: any,
    @Param('id') propertyId: string,
    @Param('challengeId') challengeId: string,
    @Body() dto: SubmitChallengeDto,
  ) {
    return this.presenceService.submitChallenge(
      req.user.userId,
      propertyId,
      challengeId,
      dto,
    );
  }
}
