import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PaymentProcessor } from './payment.processor';
import { PaymentDlqService } from './payment-dlq.service';
import { PaymentDlqController } from './payment-dlq.controller';
import { EventsModule } from '../events/events.module';
import { PaymentsModule } from '../payments/payments.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: 'payment-processing' },
      { name: 'payment-processing-dlq' },
    ),
    EventsModule,
    PaymentsModule,
    AuthModule,
  ],
  controllers: [PaymentDlqController],
  providers: [PaymentProcessor, PaymentDlqService],
})
export class QueueModule {}
