import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface XenditInvoiceResponse {
  id: string;
  invoice_url: string;
  external_id: string;
  status: string;
}

@Injectable()
export class XenditService {
  private readonly logger = new Logger(XenditService.name);
  private readonly secretKey: string | undefined;
  private readonly webhookToken: string | undefined;
  private readonly currency: string;
  private readonly successUrl: string;
  private readonly cancelUrl: string;

  constructor(configService: ConfigService) {
    this.secretKey = configService.get<string>('XENDIT_SECRET_KEY');
    this.webhookToken = configService.get<string>('XENDIT_WEBHOOK_TOKEN');
    this.currency = configService.get<string>('XENDIT_CURRENCY', 'usd');
    this.successUrl = configService.get<string>(
      'XENDIT_SUCCESS_URL',
      'http://localhost:5173/orders?paid=1',
    );
    this.cancelUrl = configService.get<string>(
      'XENDIT_CANCEL_URL',
      'http://localhost:5173/cart?cancelled=1',
    );
    if (!this.secretKey) {
      this.logger.log('Xendit not configured');
    }
  }

  isEnabled(): boolean {
    return !!this.secretKey;
  }

  verifyWebhookToken(token: string | undefined): boolean {
    if (!this.webhookToken) return false;
    return token === this.webhookToken;
  }

  async createInvoice(params: {
    orderId: string;
    invoiceNo: string;
    amount: number;
    userEmail: string;
    currency?: string;
  }): Promise<XenditInvoiceResponse> {
    if (!this.secretKey) {
      throw new Error('Xendit is not configured');
    }

    const currency = (params.currency ?? this.currency).toUpperCase();
    const auth = Buffer.from(`${this.secretKey}:`).toString('base64');
    const response = await fetch('https://api.xendit.co/v2/invoices', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        external_id: params.invoiceNo,
        amount: params.amount,
        payer_email: params.userEmail,
        description: `VividCraft order ${params.invoiceNo}`,
        success_redirect_url: this.successUrl,
        failure_redirect_url: this.cancelUrl,
        currency,
        metadata: {
          orderId: params.orderId,
          invoiceNo: params.invoiceNo,
        },
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Xendit invoice failed (${response.status}): ${body}`);
    }

    return response.json() as Promise<XenditInvoiceResponse>;
  }

  async getInvoice(invoiceId: string): Promise<XenditInvoiceResponse> {
    if (!this.secretKey) {
      throw new Error('Xendit is not configured');
    }

    const auth = Buffer.from(`${this.secretKey}:`).toString('base64');
    const response = await fetch(`https://api.xendit.co/v2/invoices/${invoiceId}`, {
      headers: { Authorization: `Basic ${auth}` },
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Xendit invoice lookup failed (${response.status}): ${body}`);
    }

    return response.json() as Promise<XenditInvoiceResponse>;
  }
}
