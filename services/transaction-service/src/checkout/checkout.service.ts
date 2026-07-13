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

@Injectable()
export class CheckoutService {
  constructor(
    private prisma: PrismaService,
    @InjectQueue('payment-processing') private paymentQueue: Queue,
  ) {}

  async processCheckout(dto: CheckoutDto) {
    const totalAmount = dto.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );

    if (totalAmount <= 0) {
      throw new BadRequestException('Order total must be greater than zero');
    }

    const invoiceNo = `VC-${Date.now()}-${uuidv4().slice(0, 8).toUpperCase()}`;

    const order = await this.prisma.$transaction(
      async (tx) => {
        for (const item of dto.items) {
          const existingPurchase = await tx.orderItem.findFirst({
            where: {
              productId: item.productId,
              order: {
                userId: dto.userId,
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
                userId: dto.userId,
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
            userId: dto.userId,
            userEmail: dto.userEmail,
            status: OrderStatus.PENDING,
            totalAmount: new Prisma.Decimal(totalAmount),
            invoiceNo,
            items: {
              create: dto.items.map((item) => ({
                productId: item.productId,
                productName: item.productName,
                productType: item.productType,
                price: new Prisma.Decimal(item.price),
                quantity: item.quantity,
              })),
            },
          },
          include: { items: true },
        });

        const lockExpiry = new Date();
        lockExpiry.setMinutes(lockExpiry.getMinutes() + 15);

        for (const item of dto.items) {
          await tx.purchaseLock.upsert({
            where: {
              userId_productId: {
                userId: dto.userId,
                productId: item.productId,
              },
            },
            create: {
              userId: dto.userId,
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
            method: 'SIMULATED',
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

    await this.paymentQueue.add(
      'process-payment',
      {
        orderId: order.id,
        invoiceNo: order.invoiceNo,
        totalAmount,
        userEmail: dto.userEmail,
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
      message: 'Checkout initiated. Payment is being processed.',
    };
  }
}
