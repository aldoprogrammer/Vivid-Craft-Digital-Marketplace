import { Injectable } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.module';

export interface CreatorAnalytics {
  revenue: number;
  totalSales: number;
  salesByType: Record<string, number>;
  salesByMonth: { month: string; revenue: number; sales: number }[];
  recentSales: {
    productName: string;
    productType: string;
    price: number;
    quantity: number;
    invoiceNo: string;
    soldAt: string;
  }[];
  topProducts: {
    productId: string;
    productName: string;
    sales: number;
    revenue: number;
  }[];
}

@Injectable()
export class CreatorAnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getForCreator(creatorId: string): Promise<CreatorAnalytics> {
    const items = await this.prisma.orderItem.findMany({
      where: {
        creatorId,
        order: { status: OrderStatus.PAID },
      },
      include: { order: true },
      orderBy: { order: { createdAt: 'desc' } },
    });

    const salesByType: Record<string, number> = { COMIC: 0, ART: 0, ASSET: 0 };
    const monthMap = new Map<string, { revenue: number; sales: number }>();
    const productMap = new Map<string, { productName: string; sales: number; revenue: number }>();

    let revenue = 0;
    let totalSales = 0;

    for (const item of items) {
      const lineTotal = Number(item.price) * item.quantity;
      revenue += lineTotal;
      totalSales += item.quantity;

      salesByType[item.productType] = (salesByType[item.productType] ?? 0) + item.quantity;

      const monthKey = item.order.createdAt.toISOString().slice(0, 7);
      const monthEntry = monthMap.get(monthKey) ?? { revenue: 0, sales: 0 };
      monthEntry.revenue += lineTotal;
      monthEntry.sales += item.quantity;
      monthMap.set(monthKey, monthEntry);

      const existing = productMap.get(item.productId) ?? {
        productName: item.productName,
        sales: 0,
        revenue: 0,
      };
      existing.sales += item.quantity;
      existing.revenue += lineTotal;
      productMap.set(item.productId, existing);
    }

    const salesByMonth = Array.from(monthMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([month, data]) => ({ month, ...data }));

    const recentSales = items.slice(0, 8).map((item) => ({
      productName: item.productName,
      productType: item.productType,
      price: Number(item.price),
      quantity: item.quantity,
      invoiceNo: item.order.invoiceNo,
      soldAt: item.order.createdAt.toISOString(),
    }));

    const topProducts = Array.from(productMap.entries())
      .map(([productId, data]) => ({ productId, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    return {
      revenue,
      totalSales,
      salesByType,
      salesByMonth,
      recentSales,
      topProducts,
    };
  }
}
