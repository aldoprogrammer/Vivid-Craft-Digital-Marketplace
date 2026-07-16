import { Link, Navigate } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { useAuthStore } from '@/stores/authStore';
import { useAuthHydrated } from '@/hooks/useAuthHydrated';
import { useOrders } from '@/hooks/useApi';

const ORDER_STATUS: Record<string, { label: string; className: string }> = {
  PENDING: { label: 'Pending', className: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30' },
  PROCESSING: { label: 'Processing', className: 'text-blue-400 bg-blue-400/10 border-blue-400/30' },
  PAID: { label: 'Paid', className: 'text-green-400 bg-green-400/10 border-green-400/30' },
  FAILED: { label: 'Failed', className: 'text-red-400 bg-red-400/10 border-red-400/30' },
  REFUNDED: { label: 'Refunded', className: 'text-gray-400 bg-gray-400/10 border-gray-400/30' },
};

const PAYMENT_STATUS: Record<string, string> = {
  PENDING: 'Waiting',
  COMPLETED: 'Success',
  FAILED: 'Failed',
};

export function OrdersPage() {
  const hydrated = useAuthHydrated();
  const { user, isAuthenticated } = useAuthStore();
  const { data: orders, isLoading, error } = useOrders(hydrated ? user?.id : undefined);

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
    <div className="max-w-3xl mx-auto animate-fade-in">
      <PageHeader
        title="My Orders"
        subtitle={`Orders for ${user?.email}. Paid items unlock in Library.`}
      />

      <div className="flex flex-wrap gap-2 mb-6 text-xs text-mist">
        <span className="badge border border-yellow-400/30 text-yellow-400">Pending</span>
        <span className="badge border border-blue-400/30 text-blue-400">Processing</span>
        <span className="badge border border-green-400/30 text-green-400">Paid</span>
        <span className="badge border border-red-400/30 text-red-400">Failed</span>
      </div>

      {!orders?.length ? (
        <EmptyState
          icon="📦"
          title="No orders yet"
          description="Complete a checkout from your cart. Orders appear here with live payment status."
          actionLabel="Browse Marketplace"
          actionTo="/"
        />
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const status = ORDER_STATUS[order.status] ?? ORDER_STATUS.PENDING;
            const paymentLabel =
              PAYMENT_STATUS[order.payment?.status ?? ''] ??
              order.payment?.status ??
              'N/A';
            const isPaid = order.status === 'PAID';

            return (
              <div key={order.id} className="glass-panel p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                  <div>
                    <p className="font-mono text-sm text-mist">{order.invoiceNo}</p>
                    <p className="text-xs text-mist mt-1">
                      {new Date(order.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <span className={`badge border ${status.className}`}>{status.label}</span>
                </div>
                <ul className="space-y-3 mb-4 pb-4 border-b border-surface-border">
                  {order.items.map((item, i) => (
                    <li key={item.id ?? i} className="text-sm">
                      <div className="flex justify-between gap-3">
                        <span className="text-content font-medium">
                          {item.productName} ×{item.quantity}
                        </span>
                        <span className="text-mist shrink-0">
                          ${Number(item.price).toFixed(2)}
                        </span>
                      </div>
                      <p className="text-xs text-mist mt-0.5">
                        {item.productType}
                        {item.productId ? ` · ${item.productId.slice(0, 8)}…` : ''}
                      </p>
                    </li>
                  ))}
                </ul>
                <div className="flex flex-wrap justify-between items-center gap-3">
                  <span className="text-mist text-sm">
                    Payment: <span className="text-content">{paymentLabel}</span>
                  </span>
                  <div className="flex items-center gap-3">
                    {isPaid && (
                      <Link to="/library" className="btn-primary py-2 px-4 text-xs">
                        Open in Library
                      </Link>
                    )}
                    <span className="text-lg font-bold text-brand-highlight">
                      ${Number(order.totalAmount).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
