import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { useAuthStore } from '@/stores/authStore';
import { useAuthHydrated } from '@/hooks/useAuthHydrated';
import { useCartStore } from '@/stores/cartStore';
import {
  useAbandonCheckout,
  useConfirmPayment,
  useOrders,
  useResumePayment,
  type Order,
} from '@/hooks/useApi';
import {
  clearPendingCheckoutOrderId,
  getPendingCheckoutOrderId,
  setPendingCheckoutOrderId,
} from '@/lib/checkoutSession';
import { getApiErrorMessage } from '@/lib/errors';
import {
  countOrdersByStatus,
  filterOrdersByStatus,
  formatOrderNumber,
  ORDER_STATUS_FILTERS,
  orderItemTotals,
  orderItemsLabel,
  paginateOrders,
  type OrderStatusFilter,
} from '@/lib/orders';
import { notify } from '@/lib/toast';

const ORDER_STATUS: Record<string, { label: string; className: string }> = {
  PENDING: { label: 'Awaiting payment', className: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30' },
  PROCESSING: { label: 'Processing', className: 'text-blue-400 bg-blue-400/10 border-blue-400/30' },
  PAID: { label: 'Paid', className: 'text-green-400 bg-green-400/10 border-green-400/30' },
  FAILED: { label: 'Cancelled', className: 'text-red-400 bg-red-400/10 border-red-400/30' },
  REFUNDED: { label: 'Refunded', className: 'text-gray-400 bg-gray-400/10 border-gray-400/30' },
};

const PAYMENT_STATUS: Record<string, string> = {
  PENDING: 'Not paid yet',
  COMPLETED: 'Paid',
  FAILED: 'Failed',
};

const TYPE_EMOJI: Record<string, string> = { COMIC: '📚', ART: '🎨', ASSET: '📦' };

function OrderDetailPanel({
  order,
  isBusy,
  onResume,
  onCancel,
}: {
  order: Order;
  isBusy: boolean;
  onResume: () => void;
  onCancel: () => void;
}) {
  const isPaid = order.status === 'PAID';
  const isUnpaid = order.status === 'PENDING' || order.status === 'PROCESSING';
  const paymentLabel =
    PAYMENT_STATUS[order.payment?.status ?? ''] ?? order.payment?.status ?? 'N/A';

  return (
    <div className="px-4 pb-4 pt-2 space-y-4 bg-surface/40">
      <div className="grid sm:grid-cols-2 gap-3 text-xs">
        <div>
          <p className="text-mist mb-0.5">Invoice</p>
          <p className="font-mono text-content">{order.invoiceNo}</p>
        </div>
        <div>
          <p className="text-mist mb-0.5">Payment</p>
          <p className="text-content">{paymentLabel}</p>
        </div>
        {order.payment?.transactionId && (
          <div className="sm:col-span-2">
            <p className="text-mist mb-0.5">Transaction ID</p>
            <p className="font-mono text-content break-all">{order.payment.transactionId}</p>
          </div>
        )}
      </div>

      <div>
        <p className="text-xs font-semibold text-content mb-2">Items in this order</p>
        <div className="rounded-xl border border-surface-border overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-surface-border bg-surface-elevated text-mist text-xs">
                <th className="py-2 px-3 font-medium">Product</th>
                <th className="py-2 px-3 font-medium">Type</th>
                <th className="py-2 px-3 font-medium text-center">Qty</th>
                <th className="py-2 px-3 font-medium text-right">Price</th>
                <th className="py-2 px-3 font-medium text-right">Line total</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item, i) => {
                const lineTotal = Number(item.price) * item.quantity;
                return (
                  <tr key={item.id ?? i} className="border-b border-surface-border/60 last:border-0">
                    <td className="py-2.5 px-3 text-content">
                      <span className="mr-1.5">{TYPE_EMOJI[item.productType] ?? '📦'}</span>
                      {item.productName}
                    </td>
                    <td className="py-2.5 px-3 text-mist text-xs">{item.productType}</td>
                    <td className="py-2.5 px-3 text-center text-content">{item.quantity}</td>
                    <td className="py-2.5 px-3 text-right text-mist">
                      ${Number(item.price).toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-content font-medium">
                      ${lineTotal.toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <p className="text-sm text-mist">
          Order total{' '}
          <span className="text-lg font-bold text-brand-highlight">
            ${Number(order.totalAmount).toFixed(2)}
          </span>
        </p>
        <div className="flex flex-wrap gap-2">
          {isUnpaid && (
            <>
              <button
                type="button"
                disabled={isBusy}
                onClick={onResume}
                className="btn-primary py-2 px-4 text-xs disabled:opacity-50"
              >
                {isBusy ? 'Loading…' : 'Complete payment'}
              </button>
              <button
                type="button"
                disabled={isBusy}
                onClick={onCancel}
                className="btn-secondary py-2 px-4 text-xs disabled:opacity-50"
              >
                Cancel order
              </button>
            </>
          )}
          {isPaid && (
            <Link to="/library" className="btn-primary py-2 px-4 text-xs">
              Open in Library
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

export function OrdersPage() {
  const hydrated = useAuthHydrated();
  const { user, isAuthenticated } = useAuthStore();
  const clearCart = useCartStore((s) => s.clearCart);
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const confirmPayment = useConfirmPayment();
  const abandonCheckout = useAbandonCheckout();
  const resumePayment = useResumePayment();
  const syncedPendingRef = useRef(false);
  const paidReturnHandledRef = useRef(false);
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<OrderStatusFilter>('ALL');
  const [page, setPage] = useState(1);
  const { data: orders, isLoading, error } = useOrders(hydrated ? user?.id : undefined);

  const filteredOrders = useMemo(
    () => filterOrdersByStatus(orders ?? [], statusFilter),
    [orders, statusFilter],
  );

  const pagination = useMemo(
    () => paginateOrders(filteredOrders, page),
    [filteredOrders, page],
  );

  useEffect(() => {
    setPage(1);
    setExpandedOrderId(null);
  }, [statusFilter]);

  useEffect(() => {
    if (!user?.id) return;
    void queryClient.invalidateQueries({ queryKey: ['owned-product-ids', user.id] });
  }, [user?.id, queryClient]);

  useEffect(() => {
    if (searchParams.get('paid') !== '1' || paidReturnHandledRef.current) return;

    paidReturnHandledRef.current = true;
    setSearchParams({}, { replace: true });

    const orderId = getPendingCheckoutOrderId();
    clearPendingCheckoutOrderId();

    let active = true;
    void (async () => {
      let paid = false;
      if (orderId) {
        try {
          const result = await confirmPayment.mutateAsync(orderId);
          paid = result.status === 'PAID';
        } catch {
          /* provider may still be processing */
        }
      }

      if (!active) return;
      await queryClient.invalidateQueries({ queryKey: ['orders', user?.id] });
      await queryClient.invalidateQueries({ queryKey: ['owned-product-ids', user?.id] });

      if (paid) {
        clearCart();
        notify.success('Payment successful! Your items are in Library.', 'payment-success');
      } else if (orderId) {
        notify.info('Payment is still processing. Refresh this page in a moment.');
      }
    })();

    return () => {
      active = false;
    };
  }, [searchParams, setSearchParams, clearCart, confirmPayment, queryClient, user?.id]);

  useEffect(() => {
    if (!orders?.length || syncedPendingRef.current) return;

    const pendingIds = orders
      .filter((o) => o.status === 'PENDING' || o.status === 'PROCESSING')
      .map((o) => o.id);

    if (!pendingIds.length) return;

    syncedPendingRef.current = true;
    void Promise.all(
      pendingIds.map((id) => confirmPayment.mutateAsync(id).catch(() => undefined)),
    ).then(() => {
      void queryClient.invalidateQueries({ queryKey: ['orders', user?.id] });
      void queryClient.invalidateQueries({ queryKey: ['owned-product-ids', user?.id] });
    });
  }, [orders, confirmPayment, queryClient, user?.id]);

  const handleResume = async (orderId: string) => {
    setBusyOrderId(orderId);
    try {
      const result = await resumePayment.mutateAsync(orderId);
      if (result.status === 'PAID') {
        notify.success('Payment confirmed! Check your Library.');
        return;
      }
      if (result.checkoutUrl) {
        setPendingCheckoutOrderId(orderId);
        window.location.href = result.checkoutUrl;
        return;
      }
      if (result.status === 'FAILED') {
        notify.info('This order was cancelled. You can checkout again from cart.');
      }
    } catch (err) {
      notify.error(getApiErrorMessage(err, 'Could not resume payment.'));
    } finally {
      setBusyOrderId(null);
    }
  };

  const handleCancel = async (orderId: string) => {
    setBusyOrderId(orderId);
    try {
      await abandonCheckout.mutateAsync(orderId);
      notify.info('Order cancelled. Items are not yours — add them to cart again anytime.');
    } catch (err) {
      notify.error(getApiErrorMessage(err, 'Could not cancel order.'));
    } finally {
      setBusyOrderId(null);
    }
  };

  if (!hydrated) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-brand-accent border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-brand-accent border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        icon="⚠️"
        title="Couldn't load orders"
        description="Transaction service may still be starting. Try again shortly."
      />
    );
  }

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      <PageHeader
        title="My Orders"
        subtitle="One checkout = one order. Expand a row to see every item and quantity."
      />

      {!orders?.length ? (
        <EmptyState
          icon="📦"
          title="No orders yet"
          description="Complete a checkout from your cart. All cart items are grouped into a single order."
          actionLabel="Browse Marketplace"
          actionTo="/"
        />
      ) : (
        <section className="glass-panel p-4 sm:p-6 overflow-x-auto space-y-4">
          <div className="flex flex-wrap gap-2">
            {ORDER_STATUS_FILTERS.map((option) => {
              const count = countOrdersByStatus(orders ?? [], option.id);
              const active = statusFilter === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setStatusFilter(option.id)}
                  className={`rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors ${
                    active
                      ? 'border-brand-accent bg-brand-highlight/10 text-content'
                      : 'border-surface-border bg-surface-elevated text-mist hover:border-brand-secondary hover:text-content'
                  }`}
                >
                  {option.label}
                  <span className="ml-1.5 text-mist">({count})</span>
                </button>
              );
            })}
          </div>

          {filteredOrders.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-content font-medium mb-1">No orders in this filter</p>
              <p className="text-sm text-mist mb-4">Try another status tab above.</p>
              {statusFilter !== 'ALL' && (
                <button
                  type="button"
                  onClick={() => setStatusFilter('ALL')}
                  className="btn-secondary py-2 px-4 text-xs"
                >
                  Show all orders
                </button>
              )}
            </div>
          ) : (
            <>
          <table className="w-full text-sm text-left min-w-[640px]">
            <thead>
              <tr className="border-b border-surface-border text-mist text-xs">
                <th className="py-2 pr-3 font-medium w-8" />
                <th className="py-2 pr-3 font-medium">Order</th>
                <th className="py-2 pr-3 font-medium">Date</th>
                <th className="py-2 pr-3 font-medium">Items</th>
                <th className="py-2 pr-3 font-medium text-center">Qty</th>
                <th className="py-2 pr-3 font-medium text-right">Total</th>
                <th className="py-2 pr-3 font-medium">Status</th>
                <th className="py-2 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pagination.items.map((order) => {
                const status = ORDER_STATUS[order.status] ?? ORDER_STATUS.PENDING;
                const { totalQty } = orderItemTotals(order.items);
                const isPaid = order.status === 'PAID';
                const isUnpaid = order.status === 'PENDING' || order.status === 'PROCESSING';
                const isBusy = busyOrderId === order.id;
                const isExpanded = expandedOrderId === order.id;
                const orderNo = formatOrderNumber(order.invoiceNo);

                return (
                  <Fragment key={order.id}>
                    <tr
                      className="border-b border-surface-border/60 hover:bg-surface-elevated/40 transition-colors"
                    >
                      <td className="py-3 pr-2">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedOrderId(isExpanded ? null : order.id)
                          }
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-surface-border text-mist hover:text-content hover:border-brand-secondary"
                          aria-expanded={isExpanded}
                          aria-label={`${isExpanded ? 'Hide' : 'Show'} order ${orderNo} details`}
                        >
                          {isExpanded ? '−' : '+'}
                        </button>
                      </td>
                      <td className="py-3 pr-3">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedOrderId(isExpanded ? null : order.id)
                          }
                          className="text-left"
                        >
                          <span className="font-semibold text-content">{orderNo}</span>
                          <span className="block text-[11px] text-mist font-mono mt-0.5 truncate max-w-[120px]">
                            {order.invoiceNo}
                          </span>
                        </button>
                      </td>
                      <td className="py-3 pr-3 text-mist text-xs whitespace-nowrap">
                        {new Date(order.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3 pr-3 text-content max-w-[200px]">
                        <span className="line-clamp-2">{orderItemsLabel(order.items)}</span>
                      </td>
                      <td className="py-3 pr-3 text-center text-content">{totalQty}</td>
                      <td className="py-3 pr-3 text-right font-semibold text-brand-highlight whitespace-nowrap">
                        ${Number(order.totalAmount).toFixed(2)}
                      </td>
                      <td className="py-3 pr-3">
                        <span className={`badge border whitespace-nowrap ${status.className}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex flex-wrap justify-end gap-1.5">
                          {isUnpaid && (
                            <>
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => handleResume(order.id)}
                                className="btn-primary py-1.5 px-3 text-[11px] disabled:opacity-50"
                              >
                                Pay
                              </button>
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => handleCancel(order.id)}
                                className="btn-secondary py-1.5 px-3 text-[11px] disabled:opacity-50"
                              >
                                Cancel
                              </button>
                            </>
                          )}
                          {isPaid && (
                            <Link
                              to="/library"
                              className="btn-primary py-1.5 px-3 text-[11px] inline-block"
                            >
                              Library
                            </Link>
                          )}
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedOrderId(isExpanded ? null : order.id)
                            }
                            className="btn-secondary py-1.5 px-3 text-[11px]"
                          >
                            Details
                          </button>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="border-b border-surface-border/60">
                        <td colSpan={8} className="p-0">
                          <OrderDetailPanel
                            order={order}
                            isBusy={isBusy}
                            onResume={() => handleResume(order.id)}
                            onCancel={() => handleCancel(order.id)}
                          />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-surface-border text-xs text-mist">
            <span>
              Showing {(pagination.page - 1) * pagination.pageSize + 1}–
              {Math.min(pagination.page * pagination.pageSize, pagination.total)} of{' '}
              {pagination.total}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={pagination.page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="btn-secondary py-1.5 px-3 text-xs disabled:opacity-40"
              >
                Previous
              </button>
              <span className="text-content">
                Page {pagination.page} / {pagination.totalPages}
              </span>
              <button
                type="button"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="btn-secondary py-1.5 px-3 text-xs disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
            </>
          )}
        </section>
      )}
    </div>
  );
}
