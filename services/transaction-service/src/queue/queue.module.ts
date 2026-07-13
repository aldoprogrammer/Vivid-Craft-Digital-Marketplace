import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PaymentProcessor } from './payment.processor';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'payment-processing' }),
  ],
  providers: [PaymentProcessor],
})
export class QueueModule {}
