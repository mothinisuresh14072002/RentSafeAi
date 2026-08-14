import { Controller, Post, Param, Body, UseGuards, Request, Headers } from '@nestjs/common';
import { ReviewService } from './review.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';
import { AuditReasonGuard } from '../common/audit/audit-reason.guard';

export class ReviewActionDto {
  action: 'ASSIGN' | 'REQUEST_CHANGES' | 'APPROVE' | 'REJECT' | 'SUSPEND' | 'EXPIRE' | 'REOPEN';
}

@Controller('review')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Post('property/:propertyId/submit')
  @Roles('OWNER')
  async submitForReview(@Request() req: any, @Param('propertyId') propertyId: string) {
    return this.reviewService.submit(propertyId, req.user.userId);
  }

  @Post('cases/:caseId/decide')
  @Roles('REVIEWER', 'ADMIN')
  @UseGuards(AuditReasonGuard)
  async decide(
    @Request() req: any,
    @Param('caseId') caseId: string,
    @Body() dto: ReviewActionDto,
    @Headers('x-audit-reason') reason: string,
  ) {
    const reviewerId = req.user.userId;

    switch (dto.action) {
      case 'ASSIGN': return this.reviewService.assign(caseId, reviewerId, reason);
      case 'REQUEST_CHANGES': return this.reviewService.requestChanges(caseId, reviewerId, reason);
      case 'APPROVE': return this.reviewService.approve(caseId, reviewerId, reason);
      case 'REJECT': return this.reviewService.reject(caseId, reviewerId, reason);
      case 'SUSPEND': return this.reviewService.suspend(caseId, reviewerId, reason);
      case 'EXPIRE': return this.reviewService.expire(caseId, reviewerId, reason);
      case 'REOPEN': return this.reviewService.reopen(caseId, reviewerId, reason);
      default: throw new Error('Unknown action');
    }
  }

  @Post('property/:propertyId/override/:checkType')
  @Roles('REVIEWER', 'ADMIN')
  @UseGuards(AuditReasonGuard)
  async overrideCheck(
    @Request() req: any,
    @Param('propertyId') propertyId: string,
    @Param('checkType') checkType: string,
    @Headers('x-audit-reason') reason: string,
  ) {
    return this.reviewService.overrideCheck(propertyId, req.user.userId, checkType, reason);
  }
}
