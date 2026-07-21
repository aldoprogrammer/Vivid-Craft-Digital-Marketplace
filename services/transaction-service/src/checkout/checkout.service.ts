import {
  Injectable,
  ConflictException,
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Prisma, OrderStatus, PaymentStatus } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../prisma/prisma.module';
import { CheckoutDto } from './dto/checkout.dto';
import { PaymentProvider } from './dto/payment-provider.enum';
import { CheckoutCurrency } from './dto/checkout-currency.enum';
import { EventPublisherService } from '../events/events.module';
import { MarketplaceClient } from '../marketplace/marketplace.client';
import { StripeService } from '../stripe/stripe.service';
import { XenditService } from '../xendit/xendit.service';
import { CurrencyService } from './currency.service';
import { paymentJobId } from '../payments/payment-job.util';
import { PaymentCompletionService } from '../payments/payment-completion.service';

@Injectable()
export class CheckoutService {
  constructor(
    private prisma: PrismaService,
    @InjectQueue('payment-processing') private paymentQueue: Queue,
    private eventPublisher: EventPublisherService,
    private marketplaceClient: MarketplaceClient,
    private stripeService: StripeService,
    private xenditService: XenditService,
    private currencyService: CurrencyService,
    private paymentCompletion: PaymentCompletionService,
  ) {}

  getCheckoutOptions() {
    const methods: Array<{
      id: PaymentProvider;
      currency: CheckoutCurrency;
      label: string;
      description: string;
      channels: string[];
    }> = [];

    if (this.xenditService.isEnabled()) {
      methods.push({
        id: PaymentProvider.XENDIT,
        currency: CheckoutCurrency.IDR,
        label: '🇮🇩 Xendit',
        description: 'Recommended for Indonesia & Southeast Asia. Local payment methods and currencies supported.',
        channels: ['QRIS', 'GoPay', 'OVO', 'DANA', 'Bank Transfer'],
      });
    }

    if (this.stripeService.isEnabled()) {
      methods.push({
        id: PaymentProvider.STRIPE,
        currency: CheckoutCurrency.USD,
        label: '💳 Stripe',
        description:
          'Recommended for international payments. Best for customers paying with international cards and global payment methods.',
        channels: ['Visa', 'Mastercard', 'Amex'],
      });
    }

    if (methods.length === 0) {
      methods.push({
        id: PaymentProvider.SIMULATED,
        currency: CheckoutCurrency.USD,
        label: 'Simulated payment',
        description: 'Development mode — configure Stripe or Xendit keys',
        channels: ['Demo'],
      });
    }

    return {
      currencies: this.currencyService.getCurrencies(),
      methods,
      usdToIdr: this.currencyService.getFxRate(),
    };
  }

  private resolveProvider(
    currency: CheckoutCurrency,
    requested?: PaymentProvider,
  ): PaymentProvider {
    const options = this.getCheckoutOptions();
    const forCurrency = options.methods.filter((m) => m.currency === currency);

    if (forCurrency.length === 0) {
      throw new BadRequestException(
        `No payment provider configured for ${currency}.`,
      );
    }

    if (requested) {
      const match = forCurrency.find((m) => m.id === requested);
      if (!match) {
        throw new BadRequestException(
          `Provider "${requested}" is not available for ${currency}.`,
        );
      }
      return requested;
    }

    const mapped = this.currencyService.providerForCurrency(currency);
    if (mapped && forCurrency.some((m) => m.id === mapped)) {
      return mapped;
    }

    return forCurrency[0].id;
  }

  async abandonCheckout(orderId: string, userId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    if (order.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }
    if (order.status === OrderStatus.PAID) {
      return { abandoned: false, status: order.status };
    }
    if (order.status === OrderStatus.FAILED) {
      return { abandoned: false, status: order.status };
    }

    await this.paymentCompletion.markFailed(orderId);
    return { abandoned: true, status: OrderStatus.FAILED };
  }

  async confirmPayment(orderId: string, userId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { payment: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }
    if (order.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }
    if (order.status === OrderStatus.PAID) {
      return { orderId, status: OrderStatus.PAID, confirmed: true };
    }

    const payment = order.payment;
    if (!payment) {
      throw new BadRequestException('Payment record not found');
    }

    if (payment.method === PaymentProvider.STRIPE && payment.stripeSessionId) {
      try {
        const session = await this.stripeService.retrieveCheckoutSession(
          payment.stripeSessionId,
        );
        if (session.payment_status === 'paid') {
          await this.paymentCompletion.markPaid(orderId, {
            stripePaymentIntentId:
              typeof session.payment_intent === 'string'
                ? session.payment_intent
                : undefined,
            transactionId:
              typeof session.payment_intent === 'string'
                ? session.payment_intent
                : session.id,
          });
          return { orderId, status: OrderStatus.PAID, confirmed: true };
        }
        if (session.status === 'expired') {
          await this.paymentCompletion.markFailed(orderId);
          return { orderId, status: OrderStatus.FAILED, confirmed: true };
        }
      } catch {
        return { orderId, status: order.status, confirmed: false };
      }
    }

    if (payment.method === PaymentProvider.XENDIT && payment.xenditInvoiceId) {
      try {
        const invoice = await this.xenditService.getInvoice(payment.xenditInvoiceId);
        if (invoice.status === 'PAID' || invoice.status === 'SETTLED') {
          await this.paymentCompletion.markPaid(orderId, {
            transactionId: invoice.id,
          });
          return { orderId, status: OrderStatus.PAID, confirmed: true };
        }
        if (invoice.status === 'EXPIRED') {
          await this.paymentCompletion.markFailed(orderId);
          return { orderId, status: OrderStatus.FAILED, confirmed: true };
        }
      } catch {
        return { orderId, status: order.status, confirmed: false };
      }
    }

    return { orderId, status: order.status, confirmed: false };
  }

  async resumePayment(orderId: string, userId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { payment: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }
    if (order.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    const sync = await this.confirmPayment(orderId, userId);
    if (sync.status === OrderStatus.PAID) {
      return { orderId, status: OrderStatus.PAID, checkoutUrl: null };
    }
    if (sync.status === OrderStatus.FAILED) {
      return { orderId, status: OrderStatus.FAILED, checkoutUrl: null };
    }

    const payment = order.payment;
    if (!payment) {
      throw new BadRequestException('Payment record not found');
    }

    if (payment.method === PaymentProvider.STRIPE && payment.stripeSessionId) {
      const session = await this.stripeService.retrieveCheckoutSession(
        payment.stripeSessionId,
      );
      if (session.url) {
        return { orderId, status: order.status, checkoutUrl: session.url };
      }
    }

    if (payment.method === PaymentProvider.XENDIT && payment.xenditInvoiceId) {
      const invoice = await this.xenditService.getInvoice(payment.xenditInvoiceId);
      if (invoice.invoice_url) {
        return { orderId, status: order.status, checkoutUrl: invoice.invoice_url };
      }
    }

    throw new BadRequestException(
      'This payment session is no longer available. Cancel the order and checkout again.',
    );
  }

  async processCheckout(
    dto: CheckoutDto,
    userId: string,
    userEmail: string,
    correlationId?: string,
  ) {
    const paymentProvider = this.resolveProvider(
      dto.checkoutCurrency,
      dto.paymentProvider,
    );

    const itemsWithCreator = await Promise.all(
      dto.items.map(async (item) => {
        const creatorId = await this.marketplaceClient.getProductCreatorId(item.productId);
        if (!creatorId) {
          throw new BadRequestException(`Product "${item.productName}" is not available`);
        }
        return { ...item, creatorId };
      }),
    );

    const totalAmountUsd = itemsWithCreator.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );

    if (totalAmountUsd <= 0) {
      throw new BadRequestException('Order total must be greater than zero');
    }

    const chargeAmount = this.currencyService.convertFromUsd(
      totalAmountUsd,
      dto.checkoutCurrency,
    );

    const invoiceNo = `VC-${Date.now()}-${uuidv4().slice(0, 8).toUpperCase()}`;

    const order = await this.prisma.$transaction(
      async (tx) => {
        for (const item of itemsWithCreator) {
          const paidPurchase = await tx.orderItem.findFirst({
            where: {
              productId: item.productId,
              order: { userId, status: OrderStatus.PAID },
            },
          });

          if (paidPurchase) {
            throw new ConflictException(
              `You already own "${item.productName}". Digital goods cannot be purchased twice.`,
            );
          }

          const pendingItem = await tx.orderItem.findFirst({
            where: {
              productId: item.productId,
              order: {
                userId,
                status: { in: [OrderStatus.PENDING, OrderStatus.PROCESSING] },
              },
            },
            include: { order: true },
          });

          if (pendingItem) {
            await tx.order.update({
              where: { id: pendingItem.orderId },
              data: { status: OrderStatus.FAILED },
            });
            await tx.payment.updateMany({
              where: { orderId: pendingItem.orderId },
              data: { status: PaymentStatus.FAILED, processedAt: new Date() },
            });
            await tx.purchaseLock.deleteMany({
              where: { orderId: pendingItem.orderId },
            });
          }

          await tx.purchaseLock.deleteMany({
            where: { userId, productId: item.productId },
          });
        }

        const createdOrder = await tx.order.create({
          data: {
            userId,
            userEmail,
            status: OrderStatus.PENDING,
            totalAmount: new Prisma.Decimal(totalAmountUsd),
            invoiceNo,
            items: {
              create: itemsWithCreator.map((item) => ({
                productId: item.productId,
                productName: item.productName,
                productType: item.productType,
                creatorId: item.creatorId,
                price: new Prisma.Decimal(item.price),
                quantity: item.quantity,
              })),
            },
          },
          include: { items: true },
        });

        const lockExpiry = new Date();
        lockExpiry.setMinutes(lockExpiry.getMinutes() + 15);

        for (const item of itemsWithCreator) {
          await tx.purchaseLock.upsert({
            where: {
              userId_productId: { userId, productId: item.productId },
            },
            create: {
              userId,
              productId: item.productId,
              orderId: createdOrder.id,
              expiresAt: lockExpiry,
            },
            update: {
              orderId: createdOrder.id,
              expiresAt: lockExpiry,
            },
          });
        }

        await tx.payment.create({
          data: {
            orderId: createdOrder.id,
            amount: new Prisma.Decimal(totalAmountUsd),
            transactionId: `TXN-${uuidv4()}`,
            method: paymentProvider,
          },
        });

        return createdOrder;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 5000,
        timeout: 10000,
      },
    );

    await this.eventPublisher.publish(
      'order.created',
      {
        userId,
        orderId: order.id,
        invoiceNo: order.invoiceNo,
        status: order.status,
      },
      correlationId,
    );

    try {
      if (paymentProvider === PaymentProvider.STRIPE) {
        const session = await this.stripeService.createCheckoutSession({
          orderId: order.id,
          invoiceNo: order.invoiceNo,
          amount: chargeAmount,
          userEmail,
        });

        await this.prisma.payment.update({
          where: { orderId: order.id },
          data: { stripeSessionId: session.id },
        });

        return {
          orderId: order.id,
          invoiceNo: order.invoiceNo,
          status: order.status,
          totalAmount: totalAmountUsd,
          checkoutCurrency: dto.checkoutCurrency,
          chargeAmount,
          checkoutUrl: session.url,
          paymentMethod: PaymentProvider.STRIPE,
          message: 'Redirect to Stripe Checkout to complete payment.',
        };
      }

      if (paymentProvider === PaymentProvider.XENDIT) {
        const invoice = await this.xenditService.createInvoice({
          orderId: order.id,
          invoiceNo: order.invoiceNo,
          amount: chargeAmount,
          userEmail,
          currency: 'IDR',
        });

        await this.prisma.payment.update({
          where: { orderId: order.id },
          data: { xenditInvoiceId: invoice.id },
        });

        return {
          orderId: order.id,
          invoiceNo: order.invoiceNo,
          status: order.status,
          totalAmount: totalAmountUsd,
          checkoutCurrency: dto.checkoutCurrency,
          chargeAmount,
          checkoutUrl: invoice.invoice_url,
          paymentMethod: PaymentProvider.XENDIT,
          message: 'Redirect to Xendit to complete payment.',
        };
      }

      await this.paymentQueue.add(
        'process-payment',
        {
          orderId: order.id,
          invoiceNo: order.invoiceNo,
          totalAmount: totalAmountUsd,
          userId,
          userEmail,
          ...(correlationId ? { correlationId } : {}),
        },
        {
          jobId: paymentJobId(order.id),
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
          removeOnComplete: 100,
          removeOnFail: false,
        },
      );

      return {
        orderId: order.id,
        invoiceNo: order.invoiceNo,
        status: order.status,
        totalAmount: totalAmountUsd,
        checkoutCurrency: dto.checkoutCurrency,
        chargeAmount,
        paymentMethod: PaymentProvider.SIMULATED,
        message: 'Checkout initiated. Payment is being processed.',
      };
    } catch (err) {
      await this.prisma.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.FAILED },
      });
      await this.prisma.payment.update({
        where: { orderId: order.id },
        data: { status: PaymentStatus.FAILED, processedAt: new Date() },
      });
      await this.prisma.purchaseLock.deleteMany({ where: { orderId: order.id } });

      const message = (err as Error).message ?? '';
      if (message.includes('Invalid API Key') || message.includes('Stripe')) {
        throw new BadRequestException(
          'Card payments are unavailable right now. Try paying in IDR with local payment methods.',
        );
      }
      if (message.includes('Xendit')) {
        throw new BadRequestException(
          'Local payment could not be started. Please try again in a moment.',
        );
      }

      throw new InternalServerErrorException(
        'Payment could not be processed. Please try again.',
      );
    }
  }
}
