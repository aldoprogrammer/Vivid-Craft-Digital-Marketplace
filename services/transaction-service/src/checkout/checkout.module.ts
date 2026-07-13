import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { CheckoutController } from './checkout.controller';
import { CheckoutService } from './checkout.service';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'payment-processing' }),
  ],
  controllers: [CheckoutController],
  providers: [CheckoutService],
})
export class CheckoutModule {}
