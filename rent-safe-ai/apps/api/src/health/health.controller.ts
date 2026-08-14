import { Controller, Get } from '@nestjs/common';
import { HealthCheckService, HealthCheck, PrismaHealthIndicator } from '@nestjs/terminus';
import { PrismaService } from '../common/prisma/prisma.service';
import Redis from 'ioredis';
import * as Minio from 'minio';

@Controller('health')
export class HealthController {
  private redisClient: Redis;
  private minioClient: Minio.Client;

  constructor(
    private health: HealthCheckService,
    private db: PrismaHealthIndicator,
    private prisma: PrismaService,
  ) {
    this.redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    
    const endpoint = process.env.MINIO_ENDPOINT || 'localhost';
    const port = parseInt(process.env.MINIO_PORT || '9000', 10);
    this.minioClient = new Minio.Client({
      endPoint: endpoint,
      port: port,
      useSSL: false,
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
      () => this.db.pingCheck('database', this.prisma),
      async () => {
        try {
          await this.redisClient.ping();
          return { redis: { status: 'up' } };
        } catch (e) {
          throw new Error('Redis is down');
        }
      },
      async () => {
        try {
          // just list buckets to verify connectivity
          await this.minioClient.listBuckets();
          return { object_storage: { status: 'up' } };
        } catch (e) {
          throw new Error('MinIO is down');
        }
      }
    ]);
  }
}
