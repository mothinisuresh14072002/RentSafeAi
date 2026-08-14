import { Module } from '@nestjs/common';
import { PropertyService } from './property.service';
import { PropertyController } from './property.controller';
import { PresenceController } from './presence.controller';
import { SandboxGeocodingProvider } from './providers/sandbox-geocoding.provider';
import { AuthModule } from '../auth/auth.module';
import { PresenceService } from './presence.service';

@Module({
  imports: [AuthModule],
  controllers: [PropertyController, PresenceController],
  providers: [PropertyService, SandboxGeocodingProvider, PresenceService],
})
export class PropertyModule {}
