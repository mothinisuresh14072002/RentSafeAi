import { Module } from '@nestjs/common';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';
import { StorageModule } from '../storage/storage.module';
import { StorageService } from '../storage/storage.service';

@Module({
  imports: [StorageModule],
  controllers: [SearchController],
  providers: [SearchService, StorageService],
})
export class SearchModule {}
