import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../redis/redis.module';

@Controller('health')
export class HealthController {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
  ) {}

  @Get('live')
  live() {
    return { status: 'ok', service: 'marketplace-service', check: 'live' };
  }

  @Get('ready')
  async ready(@Res({ passthrough: true }) res: Response) {
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

    // Elasticsearch is non-blocking info only.
    const info: Record<string, string> = { elasticsearch: 'ok' };
    try {
      const esUrl = this.configService.get<string>(
        'ELASTICSEARCH_URL',
        'http://elasticsearch:9200',
      );
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 1500);
      const resp = await fetch(`${esUrl}/_cluster/health`, {
        signal: controller.signal,
      });
      clearTimeout(timeout);
      info.elasticsearch = resp.ok ? 'ok' : 'degraded';
    } catch {
      info.elasticsearch = 'unavailable';
    }

    const healthy = checks.mongodb === 'ok' && checks.redis === 'ok';
    res.status(healthy ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE);

    return {
      status: healthy ? 'ok' : 'unavailable',
      service: 'marketplace-service',
      check: 'ready',
      checks,
      info,
      timestamp: new Date().toISOString(),
    };
  }

  @Get()
  async check(@Res({ passthrough: true }) res: Response) {
    return this.ready(res);
  }
}
