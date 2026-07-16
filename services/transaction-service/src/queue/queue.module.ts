import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PaymentProcessor } from './payment.processor';
import { EventsModule } from '../events/events.module';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'payment-processing' }),
    EventsModule,
    PaymentsModule,
  ],
  providers: [PaymentProcessor],
})
export class QueueModule {}
