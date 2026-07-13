import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.module';

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  async findByUser(userId: string) {
    return this.prisma.order.findMany({
      where: { userId },
      include: { items: true, payment: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { items: true, payment: true },
    });

    if (!order) {
      throw new NotFoundException(`Order ${id} not found`);
    }

    return order;
  }

  async findByInvoice(invoiceNo: string) {
    const order = await this.prisma.order.findUnique({
      where: { invoiceNo },
      include: { items: true, payment: true },
    });

    if (!order) {
      throw new NotFoundException(`Invoice ${invoiceNo} not found`);
    }

    return order;
  }
}
