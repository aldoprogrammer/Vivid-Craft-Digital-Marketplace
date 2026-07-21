import { describe, it, expect } from 'vitest';
import { convertFromUsd, formatMoney } from './money';

describe('formatMoney', () => {
  it('formats USD', () => {
    expect(formatMoney(19.5, 'USD')).toBe('$19.50');
  });

  it('formats IDR without decimals', () => {
    expect(formatMoney(320000, 'IDR')).toBe('Rp 320.000');
  });
});

describe('convertFromUsd', () => {
  it('converts USD with two decimal places', () => {
    expect(convertFromUsd(20.456, 'USD', 16000)).toBe(20.46);
  });

  it('converts to IDR using fx rate', () => {
    expect(convertFromUsd(20, 'IDR', 16000)).toBe(320000);
  });
});
