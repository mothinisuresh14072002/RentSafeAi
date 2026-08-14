import { Module } from '@nestjs/common';
import { FraudController } from './fraud.controller';
import { FraudProcessor } from './fraud.processor';
import { StorageModule } from '../storage/storage.module';
import { StorageService } from '../storage/storage.service';

@Module({
  imports: [StorageModule],
  controllers: [FraudController],
  providers: [FraudProcessor, StorageService],
})
export class FraudModule {}
