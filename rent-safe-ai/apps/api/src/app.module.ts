import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { LoggerModule } from './common/logger/logger.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './common/prisma/prisma.module';
import { AuditModule } from './common/audit/audit.module';
import { ConsentModule } from './consent/consent.module';
import { PrivacyModule } from './privacy/privacy.module';
import { OwnerProfileModule } from './owner-profile/owner-profile.module';
import { KycModule } from './kyc/kyc.module';
import { BankModule } from './bank/bank.module';
import { PropertyModule } from './property/property.module';
import { StorageModule } from './storage/storage.module';
import { FraudModule } from './fraud/fraud.module';
import { ReviewModule } from './review/review.module';
import { ListingModule } from './listing/listing.module';
import { SearchModule } from './search/search.module';
import { ContactModule } from './contact/contact.module';
import { ViewingModule } from './viewing/viewing.module';
import { AgreementModule } from './agreement/agreement.module';
import { RiskModule } from './risk/risk.module';
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
    }),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 100,
    }]),
    LoggerModule,
    PrismaModule,
    AuditModule,
    HealthModule,
    AuthModule,
    ConsentModule,
    PrivacyModule,
    OwnerProfileModule,
    KycModule,
    BankModule,
    PropertyModule,
    StorageModule,
    FraudModule,
    ReviewModule,
    ListingModule,
    SearchModule,
    ContactModule,
    ViewingModule,
    AgreementModule,
    RiskModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
