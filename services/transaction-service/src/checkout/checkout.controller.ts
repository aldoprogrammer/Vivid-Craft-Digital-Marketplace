import { Controller, Post, Get, Body, UseGuards, Headers, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CheckoutService } from './checkout.service';
import { CheckoutDto } from './dto/checkout.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../auth/decorators/current-user.decorator';
import { CORRELATION_HEADER } from '../common/correlation';

@ApiTags('Checkout')
@Controller('checkout')
export class CheckoutController {
  constructor(private checkoutService: CheckoutService) {}

  @Get('options')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Checkout currencies and payment providers' })
  getCheckoutOptions() {
    return this.checkoutService.getCheckoutOptions();
  }

  @Get('payment-methods')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List available payment providers (legacy)' })
  getPaymentMethods() {
    const { methods } = this.checkoutService.getCheckoutOptions();
    return {
      methods: methods.map(({ id, label, description, currency }) => ({
        id,
        label,
        description,
        currency,
      })),
    };
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Process checkout with ACID transaction protection' })
  @ApiResponse({ status: 201, description: 'Checkout initiated' })
  @ApiResponse({ status: 409, description: 'Double-spend prevented' })
  processCheckout(
    @Body() dto: CheckoutDto,
    @CurrentUser() user: JwtPayload,
    @Headers(CORRELATION_HEADER) correlationId?: string,
  ) {
    const resolved =
      typeof correlationId === 'string' && correlationId.trim()
        ? correlationId.trim()
        : undefined;
    return this.checkoutService.processCheckout(dto, user.sub, user.email, resolved);
  }

  @Post(':orderId/abandon')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel an unpaid checkout and release purchase locks' })
  abandonCheckout(@Param('orderId') orderId: string, @CurrentUser() user: JwtPayload) {
    return this.checkoutService.abandonCheckout(orderId, user.sub);
  }

  @Post(':orderId/confirm')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify payment with provider and mark order paid' })
  confirmPayment(@Param('orderId') orderId: string, @CurrentUser() user: JwtPayload) {
    return this.checkoutService.confirmPayment(orderId, user.sub);
  }

  @Post(':orderId/resume')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Re-open provider checkout for an unpaid order' })
  resumePayment(@Param('orderId') orderId: string, @CurrentUser() user: JwtPayload) {
    return this.checkoutService.resumePayment(orderId, user.sub);
  }
}
