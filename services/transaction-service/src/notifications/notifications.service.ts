import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import Redis from 'ioredis';
import { DomainEvent, EVENTS_CHANNEL, EVENTS_STREAM } from '../events/events.module';
import { PrismaService } from '../prisma/prisma.module';
import { buildNotificationContent } from './notification-event.mapper';

type SseListener = (event: DomainEvent) => void;

const STREAM_GROUP = 'notifications';
const STREAM_CONSUMER = `notifications-${process.pid}`;

@Injectable()
export class NotificationsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationsService.name);
  private subscriber: Redis;
  private streamClient: Redis;
  private readonly clients = new Map<string, Set<SseListener>>();
  private sseConnectionCount = 0;
  private streamRunning = false;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    const redisOpts = {
      host: this.configService.get<string>('REDIS_HOST', 'redis'),
      port: this.configService.get<number>('REDIS_PORT', 6379),
    };
    this.subscriber = new Redis(redisOpts);
    this.streamClient = new Redis(redisOpts);
  }

  async onModuleInit() {
    this.subscriber.subscribe(EVENTS_CHANNEL);
    this.subscriber.on('message', (_channel, message) => {
      void this.handleIncomingEvent(message);
    });

    await this.ensureStreamGroup();
    this.streamRunning = true;
    void this.consumeStreamLoop();
  }

  private async ensureStreamGroup() {
    try {
      await this.streamClient.xgroup('CREATE', EVENTS_STREAM, STREAM_GROUP, '0', 'MKSTREAM');
    } catch (err) {
      const msg = (err as Error).message ?? '';
      if (!msg.includes('BUSYGROUP')) {
        this.logger.warn(`Stream group setup: ${msg}`);
      }
    }
  }

  private async consumeStreamLoop() {
    while (this.streamRunning) {
      try {
        const results = (await this.streamClient.xreadgroup(
          'GROUP',
          STREAM_GROUP,
          STREAM_CONSUMER,
          'COUNT',
          10,
          'BLOCK',
          5000,
          'STREAMS',
          EVENTS_STREAM,
          '>',
        )) as [string, [string, string[]][]][] | null;

        if (!results) continue;

        for (const [, messages] of results) {
          for (const [messageId, fields] of messages) {
            const event = this.fieldsToEvent(fields);
            if (event) {
              await this.handleIncomingEvent(JSON.stringify(event));
            }
            await this.streamClient.xack(EVENTS_STREAM, STREAM_GROUP, messageId);
          }
        }
      } catch (err) {
        if (!this.streamRunning) break;
        this.logger.warn(`Stream consumer error: ${(err as Error).message}`);
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
  }

  private fieldsToEvent(fields: string[]): DomainEvent | null {
    const map: Record<string, string> = {};
    for (let i = 0; i < fields.length; i += 2) {
      map[fields[i]] = fields[i + 1];
    }
    if (!map.id || !map.type) return null;
    let data: Record<string, unknown> = {};
    try {
      data = map.data ? (JSON.parse(map.data) as Record<string, unknown>) : {};
    } catch {
      data = {};
    }
    return {
      id: map.id,
      type: map.type,
      occurredAt: map.occurredAt || new Date().toISOString(),
      data,
      ...(map.correlationId ? { correlationId: map.correlationId } : {}),
    };
  }

  async handleIncomingEvent(message: string) {
    try {
      const event = JSON.parse(message) as DomainEvent;

      if (event.type === 'product.favorite_count_changed') {
        this.emitToAll(event);
        return;
      }

      const userId = event.data?.userId as string | undefined;
      if (!userId) return;

      const created = await this.persistFromEvent(userId, event);
      if (created) {
        this.emitToUser(userId, event);
      }
    } catch (err) {
      this.logger.warn(`Failed to parse event: ${(err as Error).message}`);
    }
  }

  /**
   * @returns true if a new notification row was created
   */
  async persistFromEvent(userId: string, event: DomainEvent): Promise<boolean> {
    const content = buildNotificationContent(event);
    if (!content) return false;

    try {
      await this.prisma.notification.create({
        data: {
          userId,
          type: event.type,
          title: content.title,
          body: content.body,
          linkPath: content.linkPath,
          payload: event.data as Prisma.InputJsonValue,
          eventId: event.id,
          correlationId: event.correlationId ?? null,
        },
      });
      return true;
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code === 'P2002') return false;
      this.logger.warn(`Failed to persist notification: ${(err as Error).message}`);
      return false;
    }
  }

  subscribe(userId: string, listener: SseListener): () => void {
    if (!this.clients.has(userId)) {
      this.clients.set(userId, new Set());
    }
    this.clients.get(userId)!.add(listener);
    this.sseConnectionCount += 1;

    return () => {
      const set = this.clients.get(userId);
      if (!set) return;
      set.delete(listener);
      this.sseConnectionCount = Math.max(0, this.sseConnectionCount - 1);
      if (set.size === 0) {
        this.clients.delete(userId);
      }
    };
  }

  getSseConnectionCount(): number {
    return this.sseConnectionCount;
  }

  async listForUser(userId: string, limit = 30) {
    const [items, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      this.countUnread(userId),
    ]);

    return {
      items: items.map((item) => this.toDto(item)),
      unreadCount,
    };
  }

  /**
   * Replay persisted notifications after a domain event id (for SSE Last-Event-ID).
   */
  async listAfterEventId(userId: string, afterEventId: string, limit = 50): Promise<DomainEvent[]> {
    const anchor = await this.prisma.notification.findFirst({
      where: { userId, eventId: afterEventId },
    });
    if (!anchor) return [];

    const items = await this.prisma.notification.findMany({
      where: {
        userId,
        createdAt: { gt: anchor.createdAt },
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });

    return items.map((item) => ({
      id: item.eventId ?? item.id,
      type: item.type,
      occurredAt: item.createdAt.toISOString(),
      data: (item.payload as Record<string, unknown>) ?? { userId },
      ...(item.correlationId ? { correlationId: item.correlationId } : {}),
    }));
  }

  async countUnread(userId: string) {
    return this.prisma.notification.count({
      where: { userId, readAt: null },
    });
  }

  async markRead(userId: string, notificationId: string) {
    const existing = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });
    if (!existing) {
      throw new NotFoundException('Notification not found');
    }
    if (existing.readAt) {
      return this.toDto(existing);
    }

    const updated = await this.prisma.notification.update({
      where: { id: notificationId },
      data: { readAt: new Date() },
    });
    return this.toDto(updated);
  }

  async markAllRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { updated: result.count };
  }

  private emitToUser(userId: string, event: DomainEvent) {
    const listeners = this.clients.get(userId);
    if (!listeners?.size) return;
    for (const listener of listeners) {
      listener(event);
    }
  }

  private emitToAll(event: DomainEvent) {
    for (const listeners of this.clients.values()) {
      for (const listener of listeners) {
        listener(event);
      }
    }
  }

  private toDto(item: {
    id: string;
    type: string;
    title: string;
    body: string;
    linkPath: string | null;
    readAt: Date | null;
    createdAt: Date;
    payload: unknown;
  }) {
    return {
      id: item.id,
      type: item.type,
      title: item.title,
      body: item.body,
      linkPath: item.linkPath,
      read: item.readAt != null,
      readAt: item.readAt?.toISOString() ?? null,
      createdAt: item.createdAt.toISOString(),
      payload: item.payload,
    };
  }

  onModuleDestroy() {
    this.streamRunning = false;
    this.subscriber.disconnect();
    this.streamClient.disconnect();
  }
}
