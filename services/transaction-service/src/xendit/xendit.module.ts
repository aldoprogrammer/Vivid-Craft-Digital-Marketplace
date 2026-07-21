import { Module } from '@nestjs/common';
import { XenditService } from './xendit.service';
import { XenditWebhookController } from './xendit.webhook.controller';
import { PaymentsModule } from '../payments/payments.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PaymentsModule, PrismaModule],
  controllers: [XenditWebhookController],
  providers: [XenditService],
  exports: [XenditService],
})
export class XenditModule {}
