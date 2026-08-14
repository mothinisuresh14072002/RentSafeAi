import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { PrismaService } from '../common/prisma/prisma.service';

@Module({
  imports: [TerminusModule],
  controllers: [HealthController],
})
export class HealthModule {}
