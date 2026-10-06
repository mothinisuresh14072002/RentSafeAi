import { Controller, Get, OnModuleDestroy } from '@nestjs/common';
import { HealthCheckService, HealthCheck } from '@nestjs/terminus';
import { PrismaService } from '../common/prisma/prisma.service';
import Redis from 'ioredis';
import * as Minio from 'minio';

@Controller('health')
export class HealthController implements OnModuleDestroy {
  private redisClient: Redis;
  private minioClient: Minio.Client;

  constructor(
    private health: HealthCheckService,
    private prisma: PrismaService,
  ) {
    this.redisClient = new Redis(
      process.env.REDIS_URL || 'redis://localhost:6379',
      {
        lazyConnect: true,
        retryStrategy: () => null,
      },
    );
    this.redisClient.on('error', () => {
      // Health endpoints report Redis connectivity explicitly.
    });

    const endpoint = process.env.MINIO_ENDPOINT || 'localhost';
    const port = parseInt(process.env.MINIO_PORT || '9000', 10);
    this.minioClient = new Minio.Client({
      endPoint: endpoint,
      port,
      useSSL: process.env.MINIO_USE_SSL === 'true',
      accessKey: process.env.MINIO_ROOT_USER || 'minioadmin',
      secretKey: process.env.MINIO_ROOT_PASSWORD || 'minioadmin',
    });
  }

  @Get('live')
  checkLiveness() {
    return { status: 'ok' };
  }

  @Get('ready')
  @HealthCheck()
  checkReadiness() {
    return this.health.check([
      async () => {
        try {
          await this.prisma.$queryRaw`SELECT 1`;
          return { database: { status: 'up' } };
        } catch {
          throw new Error('Database is down');
        }
      },
      async () => {
        try {
          await this.redisClient.ping();
          return { redis: { status: 'up' } };
        } catch {
          throw new Error('Redis is down');
        }
      },
      async () => {
        try {
          await this.minioClient.listBuckets();
          return { object_storage: { status: 'up' } };
        } catch {
          throw new Error('MinIO is down');
        }
      },
    ]);
  }

  async onModuleDestroy() {
    if (this.redisClient.status !== 'end') {
      await this.redisClient.quit().catch(() => undefined);
    }
  }
}
