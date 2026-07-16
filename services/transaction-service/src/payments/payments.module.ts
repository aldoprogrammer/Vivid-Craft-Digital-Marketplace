import { Module } from '@nestjs/common';
import { PaymentCompletionService } from './payment-completion.service';
import { EventsModule } from '../events/events.module';
import { PurchasesModule } from '../purchases/purchases.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [EventsModule, PurchasesModule, MailModule],
  providers: [PaymentCompletionService],
  exports: [PaymentCompletionService],
})
export class PaymentsModule {}
