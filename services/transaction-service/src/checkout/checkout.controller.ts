import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CheckoutService } from './checkout.service';
import { CheckoutDto } from './dto/checkout.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../auth/decorators/current-user.decorator';

@ApiTags('Checkout')
@Controller('checkout')
export class CheckoutController {
  constructor(private checkoutService: CheckoutService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Process checkout with ACID transaction protection' })
  @ApiResponse({ status: 201, description: 'Checkout initiated' })
  @ApiResponse({ status: 409, description: 'Double-spend prevented' })
  processCheckout(@Body() dto: CheckoutDto, @CurrentUser() user: JwtPayload) {
    return this.checkoutService.processCheckout(dto, user.sub, user.email);
  }
}
