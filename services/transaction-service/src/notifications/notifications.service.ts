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
import { DomainEvent, EVENTS_CHANNEL } from '../events/events.module';
import { PrismaService } from '../prisma/prisma.module';
import { buildNotificationContent } from './notification-event.mapper';

type SseListener = (event: DomainEvent) => void;

@Injectable()
export class NotificationsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationsService.name);
  private subscriber: Redis;
  private readonly clients = new Map<string, Set<SseListener>>();

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    this.subscriber = new Redis({
      host: this.configService.get<string>('REDIS_HOST', 'redis'),
      port: this.configService.get<number>('REDIS_PORT', 6379),
    });
  }

  onModuleInit() {
    this.subscriber.subscribe(EVENTS_CHANNEL);
    this.subscriber.on('message', (_channel, message) => {
      void this.handleIncomingEvent(message);
    });
  }

  private async handleIncomingEvent(message: string) {
    try {
      const event = JSON.parse(message) as DomainEvent;

      if (event.type === 'product.favorite_count_changed') {
        this.emitToAll(event);
        return;
      }

      const userId = event.data?.userId as string | undefined;
      if (!userId) return;

      await this.persistFromEvent(userId, event);
      this.emitToUser(userId, event);
    } catch (err) {
      this.logger.warn(`Failed to parse event: ${(err as Error).message}`);
    }
  }

  async persistFromEvent(userId: string, event: DomainEvent) {
    const content = buildNotificationContent(event);
    if (!content) return;

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
        },
      });
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code === 'P2002') return;
      this.logger.warn(`Failed to persist notification: ${(err as Error).message}`);
    }
  }

  subscribe(userId: string, listener: SseListener): () => void {
    if (!this.clients.has(userId)) {
      this.clients.set(userId, new Set());
    }
    this.clients.get(userId)!.add(listener);

    return () => {
      const set = this.clients.get(userId);
      if (!set) return;
      set.delete(listener);
      if (set.size === 0) {
        this.clients.delete(userId);
      }
    };
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
    this.subscriber.disconnect();
  }
}
