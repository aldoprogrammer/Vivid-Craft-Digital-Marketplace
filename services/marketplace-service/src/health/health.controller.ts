import { Controller, Get } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { RedisService } from '../redis/redis.module';

@Controller('health')
export class HealthController {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    private readonly redisService: RedisService,
  ) {}

  @Get()
  async check() {
    const checks: Record<string, string> = { mongodb: 'ok', redis: 'ok' };

    try {
      await this.connection.db?.admin().ping();
    } catch {
      checks.mongodb = 'error';
    }

    try {
      await this.redisService.getClient().ping();
    } catch {
      checks.redis = 'error';
    }

    const status = Object.values(checks).every((v) => v === 'ok') ? 'ok' : 'degraded';

    return {
      status,
      service: 'marketplace-service',
      checks,
      timestamp: new Date().toISOString(),
    };
  }
}
