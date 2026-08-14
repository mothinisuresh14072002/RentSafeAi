import { Module } from '@nestjs/common';
import { KycService } from './kyc.service';
import { KycController, ReviewerKycController } from './kyc.controller';
import { SandboxKycProvider } from './providers/sandbox.provider';
import { OwnerProfileModule } from '../owner-profile/owner-profile.module';

@Module({
  imports: [OwnerProfileModule],
  controllers: [KycController, ReviewerKycController],
  providers: [KycService, SandboxKycProvider],
})
export class KycModule {}
