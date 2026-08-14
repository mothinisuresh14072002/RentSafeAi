import {
  Controller,
  Post,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { PrivacyService } from './privacy.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('privacy')
@UseGuards(JwtAuthGuard)
export class PrivacyController {
  constructor(private readonly privacyService: PrivacyService) {}

  @Post('export')
  @HttpCode(HttpStatus.ACCEPTED)
  async requestExport(@Request() req: any) {
    await this.privacyService.requestDataExport(req.user.userId);
    return { success: true, message: 'Export request submitted' };
  }

  @Post('delete')
  @HttpCode(HttpStatus.ACCEPTED)
  async requestDeletion(@Request() req: any) {
    await this.privacyService.requestDataDeletion(req.user.userId);
    return { success: true, message: 'Deletion request submitted' };
  }
}
