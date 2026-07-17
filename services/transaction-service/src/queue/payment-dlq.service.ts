import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, QueueEvents } from 'bullmq';
import { PaymentJobData } from './payment.processor';

interface DlqJobData extends PaymentJobData {
  originalJobId?: string;
  failedReason?: string;
  failedAt?: string;
  attemptsMade?: number;
}

@Injectable()
export class PaymentDlqService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PaymentDlqService.name);
  private queueEvents: QueueEvents | null = null;

  constructor(
    @InjectQueue('payment-processing') private paymentQueue: Queue,
    @InjectQueue('payment-processing-dlq') private dlq: Queue,
    private configService: ConfigService,
  ) {}

  onModuleInit() {
    this.queueEvents = new QueueEvents('payment-processing', {
      connection: {
        host: this.configService.get<string>('REDIS_HOST', 'redis'),
        port: this.configService.get<number>('REDIS_PORT', 6379),
      },
    });

    this.queueEvents.on('failed', ({ jobId, failedReason }) => {
      void this.handleFailed(jobId, failedReason);
    });
  }

  private async handleFailed(jobId: string, failedReason: string) {
    try {
      const job = await this.paymentQueue.getJob(jobId);
      if (!job) return;

      const maxAttempts = job.opts.attempts ?? 1;
      if (job.attemptsMade < maxAttempts) return;

      const data = job.data as PaymentJobData;
      const dlqPayload: DlqJobData = {
        ...data,
        originalJobId: job.id,
        failedReason,
        failedAt: new Date().toISOString(),
        attemptsMade: job.attemptsMade,
      };

      await this.dlq.add('failed-payment', dlqPayload, {
        jobId: `dlq:${data.orderId}:${job.id}`,
        removeOnComplete: false,
        removeOnFail: false,
      });

      this.logger.warn(
        `Payment job ${job.id} moved to DLQ after ${job.attemptsMade} attempts: ${failedReason}`,
      );
    } catch (err) {
      this.logger.error(`DLQ handler error: ${(err as Error).message}`);
    }
  }

  async replay(dlqJobId: string) {
    const job = await this.dlq.getJob(dlqJobId);
    if (!job) return null;

    const data = job.data as DlqJobData;
    const {
      originalJobId: _o,
      failedReason: _f,
      failedAt: _a,
      attemptsMade: _am,
      ...paymentData
    } = data;

    const deterministicId = `payment:${paymentData.orderId}`;

    // Remove completed/failed job with same id so re-add works
    const existing = await this.paymentQueue.getJob(deterministicId);
    if (existing) {
      const state = await existing.getState();
      if (state === 'completed' || state === 'failed') {
        await existing.remove();
      }
    }

    await this.paymentQueue.add('process-payment', paymentData, {
      jobId: deterministicId,
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: 100,
      removeOnFail: false,
    });

    await job.remove();
    return { replayed: true, jobId: deterministicId, orderId: paymentData.orderId };
  }

  onModuleDestroy() {
    void this.queueEvents?.close();
  }
}
