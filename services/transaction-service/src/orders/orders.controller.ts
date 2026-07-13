import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { OrdersService } from './orders.service';

@ApiTags('Orders')
@Controller('orders')
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  @Get()
  @ApiOperation({ summary: 'List orders for a user' })
  findByUser(@Query('userId') userId: string) {
    return this.ordersService.findByUser(userId);
  }

  @Get('invoice/:invoiceNo')
  @ApiOperation({ summary: 'Get order by invoice number' })
  findByInvoice(@Param('invoiceNo') invoiceNo: string) {
    return this.ordersService.findByInvoice(invoiceNo);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order by ID' })
  findById(@Param('id') id: string) {
    return this.ordersService.findById(id);
  }
}
