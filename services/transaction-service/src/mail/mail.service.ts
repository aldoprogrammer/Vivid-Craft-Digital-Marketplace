import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;
  private readonly from: string;

  constructor(configService: ConfigService) {
    const host = configService.get<string>('SMTP_HOST');
    const port = configService.get<number>('SMTP_PORT', 1025);
    this.from = configService.get<string>('SMTP_FROM', 'noreply@vividcraft.local');

    if (host) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: false,
      });
    }
  }

  async sendPaymentReceipt(params: {
    to: string;
    invoiceNo: string;
    totalAmount: number;
    status: string;
  }) {
    if (!this.transporter) {
      this.logger.debug('SMTP not configured; skipping receipt email');
      return;
    }

    try {
      await this.transporter.sendMail({
        from: this.from,
        to: params.to,
        subject: `VividCraft receipt ${params.invoiceNo}`,
        text: [
          'Thanks for your VividCraft purchase!',
          '',
          `Invoice: ${params.invoiceNo}`,
          `Status: ${params.status}`,
          `Total: $${params.totalAmount.toFixed(2)}`,
          '',
          'Open My Library to download your digital goods.',
        ].join('\n'),
      });
      this.logger.log(`Receipt emailed to ${params.to} for ${params.invoiceNo}`);
    } catch (err) {
      this.logger.warn(`Failed to send receipt: ${(err as Error).message}`);
    }
  }
}
