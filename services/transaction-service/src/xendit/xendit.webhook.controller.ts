import {
  BadRequestException,
  Controller,
  Headers,
  Post,
  Body,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { XenditService } from './xendit.service';
import { PaymentCompletionService } from '../payments/payment-completion.service';
import { PrismaService } from '../prisma/prisma.module';

interface XenditWebhookPayload {
  id: string;
  external_id?: string;
  status: string;
  metadata?: { orderId?: string; invoiceNo?: string };
}

@ApiTags('Xendit')
@Controller('webhooks')
export class XenditWebhookController {
  constructor(
    private xenditService: XenditService,
    private completion: PaymentCompletionService,
    private prisma: PrismaService,
  ) {}

  @Post('xendit')
  @ApiOperation({ summary: 'Xendit invoice webhook receiver' })
  async handle(
    @Headers('x-callback-token') callbackToken: string,
    @Body() payload: XenditWebhookPayload,
  ) {
    if (!this.xenditService.isEnabled()) {
      throw new BadRequestException('Xendit is not enabled');
    }
    if (!this.xenditService.verifyWebhookToken(callbackToken)) {
      throw new BadRequestException('Invalid Xendit callback token');
    }

    try {
      await this.prisma.xenditWebhookEvent.create({
        data: { id: payload.id, type: payload.status },
      });
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code === 'P2002') {
        return { received: true, duplicate: true };
      }
      throw err;
    }

    const orderId = payload.metadata?.orderId;
    if (!orderId) {
      return { received: true, skipped: true };
    }

    if (payload.status === 'PAID' || payload.status === 'SETTLED') {
      await this.prisma.payment.updateMany({
        where: { orderId },
        data: {
          xenditInvoiceId: payload.id,
          method: 'XENDIT',
        },
      });
      await this.completion.markPaid(orderId, {
        transactionId: payload.id,
      });
    }

    if (payload.status === 'EXPIRED') {
      await this.completion.markFailed(orderId);
    }

    return { received: true };
  }
}
