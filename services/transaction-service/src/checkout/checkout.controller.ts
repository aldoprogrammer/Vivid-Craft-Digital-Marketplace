import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CheckoutService } from './checkout.service';
import { CheckoutDto } from './dto/checkout.dto';

@ApiTags('Checkout')
@Controller('checkout')
export class CheckoutController {
  constructor(private checkoutService: CheckoutService) {}

  @Post()
  @ApiOperation({ summary: 'Process checkout with ACID transaction protection' })
  @ApiResponse({ status: 201, description: 'Checkout initiated' })
  @ApiResponse({ status: 409, description: 'Double-spend prevented' })
  processCheckout(@Body() dto: CheckoutDto) {
    return this.checkoutService.processCheckout(dto);
  }
}
