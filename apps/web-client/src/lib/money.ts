export type CheckoutCurrencyCode = 'USD' | 'IDR';

export function formatMoney(amount: number, currency: CheckoutCurrencyCode): string {
  if (currency === 'IDR') {
    return `Rp ${Math.round(amount).toLocaleString('id-ID')}`;
  }
  return `$${amount.toFixed(2)}`;
}

export function convertFromUsd(
  amountUsd: number,
  currency: CheckoutCurrencyCode,
  usdToIdr: number,
): number {
  if (currency === 'IDR') return Math.round(amountUsd * usdToIdr);
  return Math.round(amountUsd * 100) / 100;
}
