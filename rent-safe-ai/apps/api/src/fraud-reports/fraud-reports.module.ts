import { Module } from '@nestjs/common';
import { FraudReportsController } from './fraud-reports.controller';
import { FraudReportsService } from './fraud-reports.service';

@Module({ controllers: [FraudReportsController], providers: [FraudReportsService] })
export class FraudReportsModule {}
