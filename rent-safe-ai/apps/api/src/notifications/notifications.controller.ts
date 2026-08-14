import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Request,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}
  @Get(':userId') list(@Request() req: any, @Param('userId') userId: string) {
    if (req.user.userId !== userId)
      throw new ForbiddenException('Access denied');
    return this.notifications.list(userId);
  }
  @Patch(':userId/preferences') preferences(
    @Request() req: any,
    @Param('userId') userId: string,
    @Body()
    body: {
      emailEnabled?: boolean;
      smsEnabled?: boolean;
      pushEnabled?: boolean;
    },
  ) {
    if (req.user.userId !== userId)
      throw new ForbiddenException('Access denied');
    return this.notifications.setPreference(userId, body);
  }
}
