import { Module } from '@nestjs/common';
import { PropertyService } from './property.service';
import { PropertyController } from './property.controller';
import { PresenceController } from './presence.controller';
import { SandboxGeocodingProvider } from './providers/sandbox-geocoding.provider';
import { AuthModule } from '../auth/auth.module';
import { PresenceService } from './presence.service';

import { OwnershipVerificationController } from './ownership-verification.controller';
import { OwnershipVerificationService } from './ownership-verification.service';
import { SandboxDocumentIntelligenceProvider } from './providers/sandbox-document-intelligence.provider';
import { SandboxPropertyRegistryProvider } from './providers/sandbox-property-registry.provider';
import { DocumentIntelligenceProvider } from './providers/document-intelligence.provider';
import { PropertyRegistryProvider } from './providers/property-registry.provider';

@Module({
  imports: [AuthModule],
  controllers: [
    PropertyController,
    PresenceController,
    OwnershipVerificationController,
  ],
  providers: [
    PropertyService,
    SandboxGeocodingProvider,
    PresenceService,
    OwnershipVerificationService,
    {
      provide: DocumentIntelligenceProvider,
      useClass: SandboxDocumentIntelligenceProvider,
    },
    {
      provide: PropertyRegistryProvider,
      useClass: SandboxPropertyRegistryProvider,
    },
  ],
})
export class PropertyModule {}
