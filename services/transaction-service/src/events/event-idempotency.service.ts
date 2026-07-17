import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

const IDEMPOTENCY_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days
const KEY_PREFIX = 'event:idempotency:';

@Injectable()
export class EventIdempotencyService implements OnModuleDestroy {
  private client: Redis;

  constructor(private configService: ConfigService) {
    this.client = new Redis({
      host: this.configService.get<string>('REDIS_HOST', 'redis'),
      port: this.configService.get<number>('REDIS_PORT', 6379),
    });
  }

  /**
   * Claims an event id via SET NX EX. Returns true if this caller won the claim.
   */
  async tryClaim(eventId: string): Promise<boolean> {
    const result = await this.client.set(
      `${KEY_PREFIX}${eventId}`,
      '1',
      'EX',
      IDEMPOTENCY_TTL_SECONDS,
      'NX',
    );
    return result === 'OK';
  }

  async isProcessed(eventId: string): Promise<boolean> {
    const exists = await this.client.exists(`${KEY_PREFIX}${eventId}`);
    return exists === 1;
  }

  onModuleDestroy() {
    this.client.disconnect();
  }
}
