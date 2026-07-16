import { Controller, Get, Param, UseGuards, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../auth/decorators/current-user.decorator';

@ApiTags('Orders')
@Controller('orders')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  @Get()
  @ApiOperation({ summary: 'List orders for the authenticated user (ADMIN: all orders)' })
  findByUser(@CurrentUser() user: JwtPayload) {
    if (user.role === 'ADMIN') {
      return this.ordersService.findAll();
    }
    return this.ordersService.findByUser(user.sub);
  }

  @Get('admin/all')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'List all orders (Admin only)' })
  findAllAdmin() {
    return this.ordersService.findAll();
  }

  @Get('invoice/:invoiceNo')
  @ApiOperation({ summary: 'Get order by invoice number' })
  async findByInvoice(@Param('invoiceNo') invoiceNo: string, @CurrentUser() user: JwtPayload) {
    const order = await this.ordersService.findByInvoice(invoiceNo);
    if (order.userId !== user.sub && user.role !== 'ADMIN') {
      throw new ForbiddenException('Access denied');
    }
    return order;
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order by ID' })
  async findById(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    const order = await this.ordersService.findById(id);
    if (order.userId !== user.sub && user.role !== 'ADMIN') {
      throw new ForbiddenException('Access denied');
    }
    return order;
  }
}
