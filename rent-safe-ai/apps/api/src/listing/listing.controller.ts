import { Controller, Post, Patch, Param, Body, UseGuards, Request, Headers } from '@nestjs/common';
import { ListingService, UpdateListingDto } from './listing.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';
import { AuditReasonGuard } from '../common/audit/audit-reason.guard';

@Controller('listings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ListingController {
  constructor(private readonly listingService: ListingService) {}

  @Post('property/:propertyId/draft')
  @Roles('OWNER')
  async createDraft(@Request() req, @Param('propertyId') propertyId: string, @Body() dto: UpdateListingDto) {
    return this.listingService.createDraft(propertyId, req.user.userId, dto);
  }

  @Patch(':id')
  @Roles('OWNER')
  async updateListing(@Request() req, @Param('id') listingId: string, @Body() dto: UpdateListingDto) {
    return this.listingService.updateListing(listingId, req.user.userId, dto);
  }

  @Post(':id/submit')
  @Roles('OWNER')
  async submitForReview(@Request() req, @Param('id') listingId: string) {
    return this.listingService.submitForReview(listingId, req.user.userId);
  }

  @Post(':id/publish')
  @Roles('REVIEWER', 'ADMIN')
  @UseGuards(AuditReasonGuard)
  async publish(
    @Request() req,
    @Param('id') listingId: string,
    @Headers('x-audit-reason') reason: string,
  ) {
    return this.listingService.publish(listingId, req.user.userId, reason);
  }
}
