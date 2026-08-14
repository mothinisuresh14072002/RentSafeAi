import {
  Controller,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ViewingService } from './viewing.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('viewings')
@UseGuards(JwtAuthGuard)
export class ViewingController {
  constructor(private readonly viewingService: ViewingService) {}

  @Post(':listingId/propose')
  propose(
    @Request() req: any,
    @Param('listingId') listingId: string,
    @Body() body: { schedule: string; reason: string },
  ) {
    return this.viewingService.proposeViewing(
      req.user.userId,
      listingId,
      new Date(body.schedule),
      body.reason,
    );
  }

  @Post(':id/accept')
  accept(
    @Request() req: any,
    @Param('id') id: string,
    @Body('reason') reason: string,
  ) {
    return this.viewingService.acceptViewing(req.user.userId, id, reason);
  }

  @Post(':id/reschedule')
  reschedule(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { schedule: string; reason: string },
  ) {
    return this.viewingService.rescheduleViewing(
      req.user.userId,
      id,
      new Date(body.schedule),
      body.reason,
    );
  }

  @Post(':id/cancel')
  cancel(
    @Request() req: any,
    @Param('id') id: string,
    @Body('reason') reason: string,
  ) {
    return this.viewingService.cancelViewing(req.user.userId, id, reason);
  }

  @Post(':id/confirm-tenant')
  confirmTenant(
    @Request() req: any,
    @Param('id') id: string,
    @Body('reason') reason: string,
  ) {
    return this.viewingService.confirmViewing(
      req.user.userId,
      id,
      'tenant',
      reason,
    );
  }

  @Post(':id/confirm-owner')
  confirmOwner(
    @Request() req: any,
    @Param('id') id: string,
    @Body('reason') reason: string,
  ) {
    return this.viewingService.confirmViewing(
      req.user.userId,
      id,
      'owner',
      reason,
    );
  }
}
