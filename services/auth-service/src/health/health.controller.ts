import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.module';

@Controller('health')
export class HealthController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async check() {
    const checks: Record<string, string> = { postgres: 'ok' };

    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      checks.postgres = 'error';
    }

    const status = checks.postgres === 'ok' ? 'ok' : 'degraded';

    return {
      status,
      service: 'auth-service',
      checks,
      timestamp: new Date().toISOString(),
    };
  }
}
