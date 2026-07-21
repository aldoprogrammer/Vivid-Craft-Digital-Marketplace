import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../prisma/prisma.module';
import { MarketplaceClient } from '../marketplace/marketplace.client';

@Injectable()
export class PurchasesService {
  constructor(
    private prisma: PrismaService,
    private marketplace: MarketplaceClient,
  ) {}

  async ensureDeliveriesForPaidOrder(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order || order.status !== OrderStatus.PAID) {
      return [];
    }

    const deliveries = [];
    for (const item of order.items) {
      const product = await this.marketplace.getProduct(item.productId);
      const delivery = await this.prisma.digitalDelivery.upsert({
        where: { orderItemId: item.id },
        create: {
          userId: order.userId,
          orderId: order.id,
          orderItemId: item.id,
          productId: item.productId,
          productName: item.productName,
          productType: item.productType,
          invoiceNo: order.invoiceNo,
          downloadToken: uuidv4(),
          assetFileUrl: product?.assetFileUrl,
          assetFileName: product?.assetFileName,
          assetMimeType: product?.assetMimeType,
        },
        update: {
          assetFileUrl: product?.assetFileUrl ?? undefined,
          assetFileName: product?.assetFileName ?? undefined,
          assetMimeType: product?.assetMimeType ?? undefined,
        },
      });
      deliveries.push(delivery);
    }
    return deliveries;
  }

  async findOwnedProductIds(userId: string): Promise<string[]> {
    const deliveries = await this.prisma.digitalDelivery.findMany({
      where: { userId },
      select: { productId: true },
    });
    const fromPaid = await this.prisma.orderItem.findMany({
      where: {
        order: {
          userId,
          status: OrderStatus.PAID,
        },
      },
      select: { productId: true },
    });
    return [...new Set([...deliveries.map((d) => d.productId), ...fromPaid.map((i) => i.productId)])];
  }

  async findByUser(userId: string) {
    const paidOrders = await this.prisma.order.findMany({
      where: { userId, status: OrderStatus.PAID },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });

    for (const order of paidOrders) {
      await this.ensureDeliveriesForPaidOrder(order.id);
    }

    const deliveries = await this.prisma.digitalDelivery.findMany({
      where: { userId },
      orderBy: { deliveredAt: 'desc' },
    });

    return deliveries.map((d) => ({
      id: d.id,
      productId: d.productId,
      productName: d.productName,
      productType: d.productType,
      invoiceNo: d.invoiceNo,
      orderId: d.orderId,
      downloadToken: d.downloadToken,
      downloadUrl: `/api/transactions/purchases/${d.downloadToken}/download`,
      downloadCount: d.downloadCount,
      hasAsset: !!d.assetFileUrl,
      assetFileName: d.assetFileName,
      deliveredAt: d.deliveredAt,
      lastDownloadAt: d.lastDownloadAt,
    }));
  }

  async download(token: string, userId: string, role: string) {
    const delivery = await this.prisma.digitalDelivery.findUnique({
      where: { downloadToken: token },
    });

    if (!delivery) {
      throw new NotFoundException('Download not found');
    }

    if (delivery.userId !== userId && role !== 'ADMIN') {
      throw new ForbiddenException('This download is not yours');
    }

    await this.prisma.digitalDelivery.update({
      where: { id: delivery.id },
      data: {
        downloadCount: { increment: 1 },
        lastDownloadAt: new Date(),
      },
    });

    if (delivery.assetFileUrl) {
      const apiBase = process.env.PUBLIC_API_URL || 'http://api-gateway:3000';
      const assetUrl = delivery.assetFileUrl.startsWith('http')
        ? delivery.assetFileUrl
        : `${apiBase}${delivery.assetFileUrl}`;
      const res = await fetch(assetUrl);
      if (res.ok) {
        const buffer = Buffer.from(await res.arrayBuffer());
        return {
          kind: 'asset' as const,
          buffer,
          filename: delivery.assetFileName || `${delivery.productName}.bin`,
          mimeType: delivery.assetMimeType || 'application/octet-stream',
          delivery,
        };
      }
    }

    const body = [
      'VividCraft — Digital Purchase License',
      '====================================',
      '',
      `Product:     ${delivery.productName}`,
      `Type:        ${delivery.productType}`,
      `Product ID:  ${delivery.productId}`,
      `Invoice:     ${delivery.invoiceNo}`,
      `Order ID:    ${delivery.orderId}`,
      `Delivered:   ${delivery.deliveredAt.toISOString()}`,
      `License for: ${userId}`,
      '',
      'This file confirms your ownership of the digital good.',
      'Asset file was not attached to this listing.',
      '',
      `Download token: ${delivery.downloadToken}`,
    ].join('\n');

    const filename = `${delivery.productName.replace(/[^a-z0-9-_]+/gi, '_').toLowerCase()}_license.txt`;

    return {
      kind: 'license' as const,
      body,
      filename,
      mimeType: 'text/plain; charset=utf-8',
      delivery,
    };
  }
}
