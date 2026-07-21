import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CheckoutCurrency } from './dto/checkout-currency.enum';
import { PaymentProvider } from './dto/payment-provider.enum';

@Injectable()
export class CurrencyService {
  private readonly usdToIdr: number;

  constructor(configService: ConfigService) {
    this.usdToIdr = Number(configService.get<string>('USD_TO_IDR', '16000'));
  }

  getFxRate() {
    return this.usdToIdr;
  }

  getCurrencies() {
    return [
      {
        code: CheckoutCurrency.USD,
        label: 'US Dollar',
        symbol: '$',
        flag: '🇺🇸',
        hint: 'Best for international card payments (Stripe).',
      },
      {
        code: CheckoutCurrency.IDR,
        label: 'Indonesian Rupiah',
        symbol: 'Rp',
        flag: '🇮🇩',
        hint: 'Best for local payments (Xendit).',
      },
    ];
  }

  convertFromUsd(amountUsd: number, currency: CheckoutCurrency): number {
    if (currency === CheckoutCurrency.IDR) {
      return Math.round(amountUsd * this.usdToIdr);
    }
    return Math.round(amountUsd * 100) / 100;
  }

  providerForCurrency(currency: CheckoutCurrency): PaymentProvider | null {
    if (currency === CheckoutCurrency.USD) return PaymentProvider.STRIPE;
    if (currency === CheckoutCurrency.IDR) return PaymentProvider.XENDIT;
    return null;
  }

  currencyForProvider(provider: PaymentProvider): CheckoutCurrency | null {
    if (provider === PaymentProvider.STRIPE) return CheckoutCurrency.USD;
    if (provider === PaymentProvider.XENDIT) return CheckoutCurrency.IDR;
    return null;
  }
}
