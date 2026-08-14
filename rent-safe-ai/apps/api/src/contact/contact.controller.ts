import { Controller, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ContactService } from './contact.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('contact')
@UseGuards(JwtAuthGuard)
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Post(':listingId/request')
  request(
    @Request() req: any,
    @Param('listingId') listingId: string,
    @Body('reason') reason: string,
  ) {
    return this.contactService.requestContact(req.user.userId, listingId, reason);
  }

  @Post('requests/:requestId/consent')
  grantConsent(
    @Request() req: any,
    @Param('requestId') requestId: string,
    @Body('reason') reason: string,
  ) {
    return this.contactService.grantConsent(req.user.userId, requestId, reason);
  }
}
