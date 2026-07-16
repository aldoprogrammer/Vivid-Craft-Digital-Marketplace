import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';
import { OrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.module';
import { EventPublisherService } from '../events/events.module';
import { PaymentCompletionService } from '../payments/payment-completion.service';

interface PaymentJobData {
  orderId: string;
  invoiceNo: string;
  totalAmount: number;
  userId: string;
  userEmail: string;
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
    const { orderId, invoiceNo, userId } = job.data;
    this.logger.log(`Simulated payment processing for ${invoiceNo}`);

    await this.prisma.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.PROCESSING },
    });

    await this.eventPublisher.publish('order.status_changed', {
      userId,
      orderId,
      invoiceNo,
      status: OrderStatus.PROCESSING,
    });

    await new Promise((resolve) => setTimeout(resolve, this.simulationDelay));

    const paymentSuccess = Math.random() > 0.05;
    if (paymentSuccess) {
      await this.completion.markPaid(orderId);
    } else {
      await this.completion.markFailed(orderId);
      this.logger.warn(`Simulated payment failed for ${invoiceNo}`);
    }
  }
}
