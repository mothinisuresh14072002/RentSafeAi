import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import type { RegisterPropertyDto } from './property.service';
import { PropertyService } from './property.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';

@Controller('property')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('OWNER')
export class PropertyController {
  constructor(private readonly propertyService: PropertyService) {}

  @Post('register')
  async registerProperty(
    @Request() req: any,
    @Body() dto: RegisterPropertyDto,
  ) {
    return this.propertyService.registerProperty(req.user.userId, dto);
  }
}
