import { describe, it, expect } from 'vitest';
import type { Order } from '@/hooks/useApi';
import {
  filterOrdersByStatus,
  formatOrderNumber,
  orderItemsLabel,
  orderItemTotals,
  paginateOrders,
} from './orders';

function mockOrder(partial: Partial<Order> & Pick<Order, 'id' | 'status'>): Order {
  return {
    invoiceNo: 'VC-1784632302986-E98314F7',
    totalAmount: '20',
    createdAt: '2026-07-21T11:11:43.000Z',
    items: [
      {
        productName: 'Comic Point',
        productType: 'COMIC',
        price: '20',
        quantity: 1,
      },
    ],
    ...partial,
  };
}

describe('formatOrderNumber', () => {
  it('returns last 6 digits of invoice timestamp', () => {
    expect(formatOrderNumber('VC-1784632302986-E98314F7')).toBe('#302986');
  });

  it('returns original string when pattern does not match', () => {
    expect(formatOrderNumber('INVALID')).toBe('INVALID');
  });
});

describe('orderItemTotals', () => {
  it('sums quantities across line items', () => {
    const items = [
      { productName: 'A', productType: 'ART', price: '10', quantity: 2 },
      { productName: 'B', productType: 'COMIC', price: '5', quantity: 1 },
    ];
    expect(orderItemTotals(items)).toEqual({ lineCount: 2, totalQty: 3 });
  });
});

describe('orderItemsLabel', () => {
  it('shows single item with quantity', () => {
    const items = [{ productName: 'Comic Point', productType: 'COMIC', price: '20', quantity: 2 }];
    expect(orderItemsLabel(items)).toBe('Comic Point ×2');
  });

  it('shows summary for multiple items', () => {
    const items = [
      { productName: 'A', productType: 'ART', price: '10', quantity: 1 },
      { productName: 'B', productType: 'COMIC', price: '5', quantity: 2 },
    ];
    expect(orderItemsLabel(items)).toBe('2 items · 3 qty');
  });
});

describe('filterOrdersByStatus', () => {
  const orders = [
    mockOrder({ id: '1', status: 'PAID' }),
    mockOrder({ id: '2', status: 'PENDING' }),
    mockOrder({ id: '3', status: 'PROCESSING' }),
    mockOrder({ id: '4', status: 'FAILED' }),
    mockOrder({ id: '5', status: 'REFUNDED' }),
  ];

  it('returns all orders for ALL filter', () => {
    expect(filterOrdersByStatus(orders, 'ALL')).toHaveLength(5);
  });

  it('filters awaiting payment', () => {
    expect(filterOrdersByStatus(orders, 'AWAITING').map((o) => o.id)).toEqual(['2', '3']);
  });

  it('filters paid orders', () => {
    expect(filterOrdersByStatus(orders, 'PAID')).toHaveLength(1);
  });

  it('filters cancelled orders', () => {
    expect(filterOrdersByStatus(orders, 'CANCELLED')).toHaveLength(1);
  });
});

describe('paginateOrders', () => {
  const items = Array.from({ length: 25 }, (_, i) => i + 1);

  it('returns first page of 10', () => {
    const result = paginateOrders(items, 1, 10);
    expect(result.items).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(result.totalPages).toBe(3);
    expect(result.total).toBe(25);
  });

  it('returns last partial page', () => {
    const result = paginateOrders(items, 3, 10);
    expect(result.items).toEqual([21, 22, 23, 24, 25]);
  });

  it('clamps page below 1', () => {
    expect(paginateOrders(items, 0, 10).page).toBe(1);
  });
});
