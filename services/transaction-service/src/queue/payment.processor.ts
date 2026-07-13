import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.module';

interface PaymentJobData {
  orderId: string;
  invoiceNo: string;
  totalAmount: number;
  userEmail: string;
}

@Processor('payment-processing')
export class PaymentProcessor extends WorkerHost {
  private readonly logger = new Logger(PaymentProcessor.name);
  private readonly simulationDelay: number;

  constructor(
    private prisma: PrismaService,
    configService: ConfigService,
  ) {
    super();
    this.simulationDelay = configService.get<number>(
      'PAYMENT_SIMULATION_DELAY_MS',
      1500,
    );
  }

  async process(job: Job<PaymentJobData>): Promise<void> {
    const { orderId, invoiceNo, userEmail } = job.data;
    this.logger.log(`Processing payment for order ${orderId} (${invoiceNo})`);

    await this.prisma.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.PROCESSING },
    });

    await new Promise((resolve) => setTimeout(resolve, this.simulationDelay));

    const paymentSuccess = Math.random() > 0.05;

    if (paymentSuccess) {
      await this.prisma.$transaction(async (tx) => {
        await tx.order.update({
          where: { id: orderId },
          data: { status: OrderStatus.PAID },
        });

        await tx.payment.update({
          where: { orderId },
          data: {
            status: PaymentStatus.COMPLETED,
            processedAt: new Date(),
          },
        });

        const order = await tx.order.findUnique({
          where: { id: orderId },
          include: { items: true },
        });

        if (order) {
          for (const item of order.items) {
            await tx.purchaseLock.deleteMany({
              where: {
                userId: order.userId,
                productId: item.productId,
              },
            });
          }
        }
      });

      this.logger.log(
        `Payment completed for ${invoiceNo}. Digital delivery queued for ${userEmail}`,
      );
    } else {
      await this.prisma.$transaction(async (tx) => {
        await tx.order.update({
          where: { id: orderId },
          data: { status: OrderStatus.FAILED },
        });

        await tx.payment.update({
          where: { orderId },
          data: { status: PaymentStatus.FAILED },
        });

        const order = await tx.order.findUnique({
          where: { id: orderId },
          include: { items: true },
        });

        if (order) {
          for (const item of order.items) {
            await tx.purchaseLock.deleteMany({
              where: {
                userId: order.userId,
                productId: item.productId,
              },
            });
          }
        }
      });

      this.logger.warn(`Payment failed for ${invoiceNo}`);
    }
  }
}
