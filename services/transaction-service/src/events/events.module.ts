import { Global, Injectable, Module, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import { getCorrelationId } from '../common/correlation';
import { EventIdempotencyService } from './event-idempotency.service';

export const EVENTS_CHANNEL = 'vividcraft:events';
export const EVENTS_STREAM = 'vividcraft:events:stream';

export interface DomainEvent {
  id: string;
  type: string;
  occurredAt: string;
  data: Record<string, unknown>;
  correlationId?: string;
}

@Injectable()
export class EventPublisherService implements OnModuleDestroy {
  private publisher: Redis;

  constructor(private configService: ConfigService) {
    this.publisher = new Redis({
      host: this.configService.get<string>('REDIS_HOST', 'redis'),
      port: this.configService.get<number>('REDIS_PORT', 6379),
    });
  }

  async publish(
    type: string,
    data: Record<string, unknown>,
    correlationId?: string,
  ): Promise<DomainEvent> {
    const resolvedCorrelationId = correlationId ?? getCorrelationId();
    const event: DomainEvent = {
      id: uuidv4(),
      type,
      occurredAt: new Date().toISOString(),
      data,
      ...(resolvedCorrelationId ? { correlationId: resolvedCorrelationId } : {}),
    };

    const payload = JSON.stringify(event);
    await this.publisher.publish(EVENTS_CHANNEL, payload);
    await this.publisher.xadd(
      EVENTS_STREAM,
      '*',
      'id',
      event.id,
      'type',
      event.type,
      'occurredAt',
      event.occurredAt,
      'data',
      JSON.stringify(event.data),
      'correlationId',
      event.correlationId ?? '',
    );

    return event;
  }

  async ping(): Promise<string> {
    return this.publisher.ping();
  }

  onModuleDestroy() {
    this.publisher.disconnect();
  }
}

@Global()
@Module({
  providers: [EventPublisherService, EventIdempotencyService],
  exports: [EventPublisherService, EventIdempotencyService],
})
export class EventsModule {}
