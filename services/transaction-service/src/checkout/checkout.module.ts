import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { CheckoutController } from './checkout.controller';
import { CheckoutService } from './checkout.service';
import { CurrencyService } from './currency.service';
import { AuthModule } from '../auth/auth.module';
import { EventsModule } from '../events/events.module';
import { MarketplaceModule } from '../marketplace/marketplace.module';
import { StripeModule } from '../stripe/stripe.module';
import { XenditModule } from '../xendit/xendit.module';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'payment-processing' }),
    AuthModule,
    EventsModule,
    MarketplaceModule,
    StripeModule,
    XenditModule,
    PaymentsModule,
  ],
  controllers: [CheckoutController],
  providers: [CheckoutService, CurrencyService],
})
export class CheckoutModule {}
