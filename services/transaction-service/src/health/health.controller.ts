import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { Response } from 'express';
import { PrismaService } from '../prisma/prisma.module';
import { EventPublisherService } from '../events/events.module';

@Controller('health')
export class HealthController {
  constructor(
    private prisma: PrismaService,
    private readonly eventPublisher: EventPublisherService,
  ) {}

  @Get('live')
  live() {
    return { status: 'ok', service: 'transaction-service', check: 'live' };
  }

  @Get('ready')
  async ready(@Res({ passthrough: true }) res: Response) {
    const checks: Record<string, string> = { postgres: 'ok', redis: 'ok' };

    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      checks.postgres = 'error';
    }

    try {
      await this.eventPublisher.ping();
    } catch {
      checks.redis = 'error';
    }

    const healthy = checks.postgres === 'ok' && checks.redis === 'ok';
    res.status(healthy ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE);

    return {
      status: healthy ? 'ok' : 'unavailable',
      service: 'transaction-service',
      check: 'ready',
      checks,
      timestamp: new Date().toISOString(),
    };
  }

  @Get()
  async check(@Res({ passthrough: true }) res: Response) {
    return this.ready(res);
  }
}
