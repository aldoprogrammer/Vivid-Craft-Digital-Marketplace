import {
  BadRequestException,
  Controller,
  Headers,
  Post,
  Req,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { StripeService } from './stripe.service';
import { PaymentCompletionService } from '../payments/payment-completion.service';
import { PrismaService } from '../prisma/prisma.module';

@ApiTags('Stripe')
@Controller('webhooks')
export class StripeWebhookController {
  constructor(
    private stripeService: StripeService,
    private completion: PaymentCompletionService,
    private prisma: PrismaService,
  ) {}

  @Post('stripe')
  @ApiOperation({ summary: 'Stripe webhook receiver' })
  async handle(
    @Req() req: Request & { rawBody?: Buffer },
    @Headers('stripe-signature') signature: string,
  ) {
    if (!this.stripeService.isEnabled()) {
      throw new BadRequestException('Stripe is not enabled');
    }
    if (!signature) {
      throw new BadRequestException('Missing stripe-signature');
    }

    const rawBody = req.rawBody ?? (req.body as Buffer);
    if (!rawBody || !Buffer.isBuffer(rawBody)) {
      throw new BadRequestException('Raw body required for Stripe webhook');
    }

    const event = this.stripeService.constructEvent(rawBody, signature);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as {
        metadata?: { orderId?: string };
        client_reference_id?: string | null;
        payment_intent?: string | null;
        id: string;
      };
      const orderId = session.metadata?.orderId || session.client_reference_id;
      if (orderId) {
        await this.prisma.payment.updateMany({
          where: { orderId },
          data: {
            stripeSessionId: session.id,
            method: 'STRIPE',
          },
        });
        await this.completion.markPaid(orderId, {
          stripePaymentIntentId: session.payment_intent ?? undefined,
          transactionId: session.payment_intent ?? session.id,
        });
      }
    }

    if (event.type === 'checkout.session.expired') {
      const session = event.data.object as {
        metadata?: { orderId?: string };
        client_reference_id?: string | null;
      };
      const orderId = session.metadata?.orderId || session.client_reference_id;
      if (orderId) {
        await this.completion.markFailed(orderId);
      }
    }

    return { received: true };
  }
}
