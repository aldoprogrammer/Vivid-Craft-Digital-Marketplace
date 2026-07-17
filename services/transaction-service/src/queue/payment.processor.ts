import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';
import { OrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.module';
import { EventPublisherService } from '../events/events.module';
import { PaymentCompletionService } from '../payments/payment-completion.service';

export interface PaymentJobData {
  orderId: string;
  invoiceNo: string;
  totalAmount: number;
  userId: string;
  userEmail: string;
  correlationId?: string;
}

@Processor('payment-processing')
export class PaymentProcessor extends WorkerHost {
  private readonly logger = new Logger(PaymentProcessor.name);
  private readonly simulationDelay: number;

  constructor(
    private prisma: PrismaService,
    private eventPublisher: EventPublisherService,
    private completion: PaymentCompletionService,
    configService: ConfigService,
  ) {
    super();
    this.simulationDelay = configService.get<number>(
      'PAYMENT_SIMULATION_DELAY_MS',
      1500,
    );
  }

  async process(job: Job<PaymentJobData>): Promise<void> {
    const { orderId, invoiceNo, userId, correlationId } = job.data;
    this.logger.log(`Simulated payment processing for ${invoiceNo}`);

    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      this.logger.warn(`Order ${orderId} not found`);
      return;
    }

    if (order.status === OrderStatus.PAID || order.status === OrderStatus.FAILED) {
      this.logger.log(`Order ${invoiceNo} already ${order.status}; skipping`);
      return;
    }

    if (order.status !== OrderStatus.PROCESSING) {
      await this.prisma.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.PROCESSING },
      });

      await this.eventPublisher.publish(
        'order.status_changed',
        {
          userId,
          orderId,
          invoiceNo,
          status: OrderStatus.PROCESSING,
        },
        correlationId,
      );
    }

    await new Promise((resolve) => setTimeout(resolve, this.simulationDelay));

    const paymentSuccess = Math.random() > 0.05;
    if (paymentSuccess) {
      await this.completion.markPaid(orderId, { correlationId });
    } else {
      await this.completion.markFailed(orderId, { correlationId });
      this.logger.warn(`Simulated payment failed for ${invoiceNo}`);
    }
  }
}
