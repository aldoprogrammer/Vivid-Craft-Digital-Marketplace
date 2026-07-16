import { Global, Injectable, Module, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';

export const EVENTS_CHANNEL = 'vividcraft:events';

export interface DomainEvent {
  id: string;
  type: string;
  occurredAt: string;
  data: Record<string, unknown>;
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

  async publish(type: string, data: Record<string, unknown>): Promise<DomainEvent> {
    const event: DomainEvent = {
      id: uuidv4(),
      type,
      occurredAt: new Date().toISOString(),
      data,
    };
    await this.publisher.publish(EVENTS_CHANNEL, JSON.stringify(event));
    return event;
  }

  onModuleDestroy() {
    this.publisher.disconnect();
  }
}

@Global()
@Module({
  providers: [EventPublisherService],
  exports: [EventPublisherService],
})
export class EventsModule {}
