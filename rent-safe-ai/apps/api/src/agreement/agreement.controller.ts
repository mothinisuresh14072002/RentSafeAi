import { Controller, Post, Get, Body, Param, UseGuards, Request } from '@nestjs/common';
import { AgreementService } from './agreement.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('agreements')
@UseGuards(JwtAuthGuard)
export class AgreementController {
  constructor(private readonly agreementService: AgreementService) {}

  @Post()
  create(
    @Request() req: any,
    @Body() body: { listingId: string; tenantId: string; reason: string },
  ) {
    return this.agreementService.createDraft(req.user.userId, body.listingId, body.tenantId, body.reason);
  }

  @Post(':id/upload')
  upload(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { documentKey: string; reason: string },
  ) {
    return this.agreementService.recordUpload(req.user.userId, id, body.documentKey, body.reason);
  }

  @Post(':id/sign')
  sign(@Request() req: any, @Param('id') id: string, @Body('reason') reason: string) {
    return this.agreementService.sign(req.user.userId, id, reason);
  }

  @Post(':id/reject')
  reject(@Request() req: any, @Param('id') id: string, @Body('reason') reason: string) {
    return this.agreementService.reject(req.user.userId, id, reason);
  }

  @Get(':id/state')
  state(@Request() req: any, @Param('id') id: string) {
    return this.agreementService.getStateReference(req.user.userId, id);
  }
}
