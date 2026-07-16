import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private readonly stripe: Stripe | null;
  private readonly webhookSecret: string | undefined;
  private readonly currency: string;
  private readonly successUrl: string;
  private readonly cancelUrl: string;

  constructor(configService: ConfigService) {
    const key = configService.get<string>('STRIPE_SECRET_KEY');
    this.webhookSecret = configService.get<string>('STRIPE_WEBHOOK_SECRET');
    this.currency = configService.get<string>('STRIPE_CURRENCY', 'usd');
    this.successUrl = configService.get<string>(
      'STRIPE_SUCCESS_URL',
      'http://localhost:5173/orders?paid=1',
    );
    this.cancelUrl = configService.get<string>(
      'STRIPE_CANCEL_URL',
      'http://localhost:5173/cart?cancelled=1',
    );
    this.stripe = key ? new Stripe(key) : null;
    if (!this.stripe) {
      this.logger.log('Stripe not configured — using simulated payments');
    }
  }

  isEnabled() {
    return !!this.stripe;
  }

  async createCheckoutSession(params: {
    orderId: string;
    invoiceNo: string;
    amount: number;
    userEmail: string;
  }) {
    if (!this.stripe) {
      throw new Error('Stripe is not configured');
    }

    return this.stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: params.userEmail,
      success_url: this.successUrl,
      cancel_url: this.cancelUrl,
      client_reference_id: params.orderId,
      metadata: {
        orderId: params.orderId,
        invoiceNo: params.invoiceNo,
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: this.currency,
            unit_amount: Math.round(params.amount * 100),
            product_data: {
              name: `VividCraft order ${params.invoiceNo}`,
            },
          },
        },
      ],
    });
  }

  constructEvent(rawBody: Buffer, signature: string) {
    if (!this.stripe || !this.webhookSecret) {
      throw new Error('Stripe webhook not configured');
    }
    return this.stripe.webhooks.constructEvent(rawBody, signature, this.webhookSecret);
  }
}
