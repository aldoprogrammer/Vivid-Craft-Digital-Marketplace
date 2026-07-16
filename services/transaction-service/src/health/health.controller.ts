import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { PrismaService } from '../prisma/prisma.module';

@Controller('health')
export class HealthController {
  private redis: Redis;

  constructor(
    private prisma: PrismaService,
    configService: ConfigService,
  ) {
    this.redis = new Redis({
      host: configService.get<string>('REDIS_HOST', 'redis'),
      port: configService.get<number>('REDIS_PORT', 6379),
      lazyConnect: true,
      maxRetriesPerRequest: 1,
    });
  }

  @Get()
  async check() {
    const checks: Record<string, string> = { postgres: 'ok', redis: 'ok' };

    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      checks.postgres = 'error';
    }

    try {
      await this.redis.connect();
      await this.redis.ping();
      this.redis.disconnect();
    } catch {
      checks.redis = 'error';
    }

    const status = Object.values(checks).every((v) => v === 'ok') ? 'ok' : 'degraded';

    return {
      status,
      service: 'transaction-service',
      checks,
      timestamp: new Date().toISOString(),
    };
  }
}
