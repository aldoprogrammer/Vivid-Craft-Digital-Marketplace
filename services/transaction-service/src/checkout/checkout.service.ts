import {
  Injectable,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Prisma, OrderStatus } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../prisma/prisma.module';
import { CheckoutDto } from './dto/checkout.dto';
import { EventPublisherService } from '../events/events.module';
import { MarketplaceClient } from '../marketplace/marketplace.client';
import { StripeService } from '../stripe/stripe.service';

@Injectable()
export class CheckoutService {
  constructor(
    private prisma: PrismaService,
    @InjectQueue('payment-processing') private paymentQueue: Queue,
    private eventPublisher: EventPublisherService,
    private marketplaceClient: MarketplaceClient,
    private stripeService: StripeService,
  ) {}

  async processCheckout(dto: CheckoutDto, userId: string, userEmail: string) {
    const itemsWithCreator = await Promise.all(
      dto.items.map(async (item) => {
        const creatorId = await this.marketplaceClient.getProductCreatorId(item.productId);
        if (!creatorId) {
          throw new BadRequestException(`Product "${item.productName}" is not available`);
        }
        return { ...item, creatorId };
      }),
    );

    const totalAmount = itemsWithCreator.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );

    if (totalAmount <= 0) {
      throw new BadRequestException('Order total must be greater than zero');
    }

    const invoiceNo = `VC-${Date.now()}-${uuidv4().slice(0, 8).toUpperCase()}`;
    const useStripe = this.stripeService.isEnabled();

    const order = await this.prisma.$transaction(
      async (tx) => {
        for (const item of itemsWithCreator) {
          const existingPurchase = await tx.orderItem.findFirst({
            where: {
              productId: item.productId,
              order: {
                userId: userId,
                status: { in: [OrderStatus.PAID, OrderStatus.PROCESSING, OrderStatus.PENDING] },
              },
            },
          });

          if (existingPurchase) {
            throw new ConflictException(
              `You already own "${item.productName}". Digital goods cannot be purchased twice.`,
            );
          }

          const activeLock = await tx.purchaseLock.findUnique({
            where: {
              userId_productId: {
                userId: userId,
                productId: item.productId,
              },
            },
          });

          if (activeLock && activeLock.expiresAt > new Date()) {
            throw new ConflictException(
              `Product "${item.productName}" is currently being processed in another checkout.`,
            );
          }
        }

        const createdOrder = await tx.order.create({
          data: {
            userId: userId,
            userEmail: userEmail,
            status: OrderStatus.PENDING,
            totalAmount: new Prisma.Decimal(totalAmount),
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
              userId_productId: {
                userId: userId,
                productId: item.productId,
              },
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
            amount: new Prisma.Decimal(totalAmount),
            transactionId: `TXN-${uuidv4()}`,
            method: useStripe ? 'STRIPE' : 'SIMULATED',
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

    await this.eventPublisher.publish('order.created', {
      userId,
      orderId: order.id,
      invoiceNo: order.invoiceNo,
      status: order.status,
    });

    if (useStripe) {
      const session = await this.stripeService.createCheckoutSession({
        orderId: order.id,
        invoiceNo: order.invoiceNo,
        amount: totalAmount,
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
        totalAmount,
        checkoutUrl: session.url,
        paymentMethod: 'STRIPE',
        message: 'Redirect to Stripe Checkout to complete payment.',
      };
    }

    await this.paymentQueue.add(
      'process-payment',
      {
        orderId: order.id,
        invoiceNo: order.invoiceNo,
        totalAmount,
        userId,
        userEmail,
      },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
      },
    );

    return {
      orderId: order.id,
      invoiceNo: order.invoiceNo,
      status: order.status,
      totalAmount,
      paymentMethod: 'SIMULATED',
      message: 'Checkout initiated. Payment is being processed.',
    };
  }
}
