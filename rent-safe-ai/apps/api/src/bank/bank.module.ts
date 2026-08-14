import { Module } from '@nestjs/common';
import { BankService } from './bank.service';
import { BankController, ReviewerBankController } from './bank.controller';
import { SandboxBankProvider } from './providers/sandbox-bank.provider';
import { OwnerProfileModule } from '../owner-profile/owner-profile.module';

@Module({
  imports: [OwnerProfileModule],
  controllers: [BankController, ReviewerBankController],
  providers: [BankService, SandboxBankProvider],
})
export class BankModule {}
