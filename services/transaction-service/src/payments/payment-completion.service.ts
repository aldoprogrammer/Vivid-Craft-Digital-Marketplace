import { Injectable, Logger } from '@nestjs/common';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.module';
import { EventPublisherService } from '../events/events.module';
import { PurchasesService } from '../purchases/purchases.service';
import { MailService } from '../mail/mail.service';

@Injectable()
export class PaymentCompletionService {
  private readonly logger = new Logger(PaymentCompletionService.name);

  constructor(
    private prisma: PrismaService,
    private eventPublisher: EventPublisherService,
    private purchasesService: PurchasesService,
    private mail: MailService,
  ) {}

  async markPaid(orderId: string, extras?: { stripePaymentIntentId?: string; transactionId?: string }) {
    const existing = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { payment: true },
    });
    if (!existing) return null;
    if (existing.status === OrderStatus.PAID) return existing;

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
          ...(extras?.transactionId && { transactionId: extras.transactionId }),
          ...(extras?.stripePaymentIntentId && {
            stripePaymentIntentId: extras.stripePaymentIntentId,
          }),
        },
      });
      await tx.purchaseLock.deleteMany({ where: { orderId } });
    });

    await this.purchasesService.ensureDeliveriesForPaidOrder(orderId);

    await this.eventPublisher.publish('order.status_changed', {
      userId: existing.userId,
      orderId,
      invoiceNo: existing.invoiceNo,
      status: OrderStatus.PAID,
    });

    await this.mail.sendPaymentReceipt({
      to: existing.userEmail,
      invoiceNo: existing.invoiceNo,
      totalAmount: Number(existing.totalAmount),
      status: OrderStatus.PAID,
    });

    this.logger.log(`Order ${existing.invoiceNo} marked PAID`);
    return this.prisma.order.findUnique({ where: { id: orderId }, include: { payment: true } });
  }

  async markFailed(orderId: string) {
    const existing = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!existing || existing.status === OrderStatus.PAID) return;

    await this.prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.FAILED },
      });
      await tx.payment.update({
        where: { orderId },
        data: { status: PaymentStatus.FAILED, processedAt: new Date() },
      });
      await tx.purchaseLock.deleteMany({ where: { orderId } });
    });

    await this.eventPublisher.publish('order.status_changed', {
      userId: existing.userId,
      orderId,
      invoiceNo: existing.invoiceNo,
      status: OrderStatus.FAILED,
    });
  }
}
