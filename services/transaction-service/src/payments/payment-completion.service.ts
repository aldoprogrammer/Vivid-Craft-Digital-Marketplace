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

  async markPaid(
    orderId: string,
    extras?: {
      stripePaymentIntentId?: string;
      transactionId?: string;
      correlationId?: string;
    },
  ) {
    const existing = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { payment: true },
    });
    if (!existing) return null;

    const applied = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.order.updateMany({
        where: { id: orderId, status: { not: OrderStatus.PAID } },
        data: { status: OrderStatus.PAID },
      });
      if (updated.count === 0) return false;

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
      return true;
    });

    if (!applied) {
      return this.prisma.order.findUnique({
        where: { id: orderId },
        include: { payment: true },
      });
    }

    await this.purchasesService.ensureDeliveriesForPaidOrder(orderId);

    await this.eventPublisher.publish(
      'order.status_changed',
      {
        userId: existing.userId,
        orderId,
        invoiceNo: existing.invoiceNo,
        status: OrderStatus.PAID,
      },
      extras?.correlationId,
    );

    await this.mail.sendPaymentReceipt({
      to: existing.userEmail,
      invoiceNo: existing.invoiceNo,
      totalAmount: Number(existing.totalAmount),
      status: OrderStatus.PAID,
    });

    this.logger.log(`Order ${existing.invoiceNo} marked PAID`);
    return this.prisma.order.findUnique({ where: { id: orderId }, include: { payment: true } });
  }

  async markFailed(orderId: string, extras?: { correlationId?: string }) {
    const existing = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!existing) return;

    const applied = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.order.updateMany({
        where: {
          id: orderId,
          status: { notIn: [OrderStatus.PAID, OrderStatus.FAILED] },
        },
        data: { status: OrderStatus.FAILED },
      });
      if (updated.count === 0) return false;

      await tx.payment.update({
        where: { orderId },
        data: { status: PaymentStatus.FAILED, processedAt: new Date() },
      });
      await tx.purchaseLock.deleteMany({ where: { orderId } });
      return true;
    });

    if (!applied) return;

    await this.eventPublisher.publish(
      'order.status_changed',
      {
        userId: existing.userId,
        orderId,
        invoiceNo: existing.invoiceNo,
        status: OrderStatus.FAILED,
      },
      extras?.correlationId,
    );
  }
}
