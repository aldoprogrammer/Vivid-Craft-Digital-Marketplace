import { Injectable } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.module';
import { CreatorAnalyticsService } from '../creator/creator-analytics.service';

@Injectable()
export class ProfileService {
  constructor(
    private prisma: PrismaService,
    private analytics: CreatorAnalyticsService,
  ) {}

  async getPublicLibrary(userId: string) {
    const deliveries = await this.prisma.digitalDelivery.findMany({
      where: { userId },
      orderBy: { deliveredAt: 'desc' },
      select: {
        id: true,
        productId: true,
        productName: true,
        productType: true,
        deliveredAt: true,
      },
    });

    return deliveries.map((d) => ({
      ...d,
      deliveredAt: d.deliveredAt.toISOString(),
    }));
  }

  async getTopProducts(userId: string) {
    const analytics = await this.analytics.getForCreator(userId);
    return analytics.topProducts;
  }

  async getSalesCount(userId: string) {
    const count = await this.prisma.orderItem.count({
      where: {
        creatorId: userId,
        order: { status: OrderStatus.PAID },
      },
    });
    return { totalSales: count };
  }
}
