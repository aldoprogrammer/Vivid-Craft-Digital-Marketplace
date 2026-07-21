import type { Order } from '@/hooks/useApi';

export const ORDERS_PAGE_SIZE = 10;

export type OrderStatusFilter = 'ALL' | 'AWAITING' | 'PAID' | 'CANCELLED' | 'REFUNDED';

export const ORDER_STATUS_FILTERS: { id: OrderStatusFilter; label: string }[] = [
  { id: 'ALL', label: 'All' },
  { id: 'AWAITING', label: 'Awaiting payment' },
  { id: 'PAID', label: 'Paid' },
  { id: 'CANCELLED', label: 'Cancelled' },
  { id: 'REFUNDED', label: 'Refunded' },
];

export function formatOrderNumber(invoiceNo: string): string {
  const match = invoiceNo.match(/VC-(\d+)/);
  if (!match) return invoiceNo;
  return `#${match[1].slice(-6)}`;
}

export function orderItemTotals(items: Order['items']) {
  const lineCount = items.length;
  const totalQty = items.reduce((sum, item) => sum + item.quantity, 0);
  return { lineCount, totalQty };
}

export function orderItemsLabel(items: Order['items']): string {
  const { lineCount, totalQty } = orderItemTotals(items);
  if (lineCount === 0) return '—';
  if (lineCount === 1) {
    const item = items[0];
    return `${item.productName} ×${item.quantity}`;
  }
  return `${lineCount} items · ${totalQty} qty`;
}

export function filterOrdersByStatus(orders: Order[], filter: OrderStatusFilter): Order[] {
  switch (filter) {
    case 'AWAITING':
      return orders.filter((o) => o.status === 'PENDING' || o.status === 'PROCESSING');
    case 'PAID':
      return orders.filter((o) => o.status === 'PAID');
    case 'CANCELLED':
      return orders.filter((o) => o.status === 'FAILED');
    case 'REFUNDED':
      return orders.filter((o) => o.status === 'REFUNDED');
    default:
      return orders;
  }
}

export function countOrdersByStatus(orders: Order[], filter: OrderStatusFilter): number {
  return filterOrdersByStatus(orders, filter).length;
}

export function paginateOrders<T>(items: T[], page: number, pageSize: number = ORDERS_PAGE_SIZE) {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;

  return {
    items: items.slice(start, start + pageSize),
    page: safePage,
    pageSize,
    total,
    totalPages,
  };
}
