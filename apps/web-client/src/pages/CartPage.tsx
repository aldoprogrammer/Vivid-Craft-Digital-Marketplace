import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import * as Yup from 'yup';
import { FormEngine } from '@/components/FormEngine';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { useAuthStore } from '@/stores/authStore';
import { useAuthHydrated } from '@/hooks/useAuthHydrated';
import { useCartStore, selectCartItems, selectCartTotal } from '@/stores/cartStore';
import { useCheckout, useOwnedProductIds } from '@/hooks/useApi';
import { getApiErrorMessage } from '@/lib/errors';
import { notify } from '@/lib/toast';

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pending — payment processing',
  PROCESSING: 'Processing payment',
  PAID: 'Paid',
  FAILED: 'Payment failed',
};

const checkoutSchema = Yup.object({
  confirmEmail: Yup.string().email('Invalid email').required('Email confirmation required'),
});

const TYPE_EMOJI: Record<string, string> = { COMIC: '📚', ART: '🎨', ASSET: '📦' };

export function CartPage() {
  const hydrated = useAuthHydrated();
  const { user, isAuthenticated } = useAuthStore();
  const items = useCartStore(selectCartItems);
  const total = useCartStore(selectCartTotal);
  const removeItem = useCartStore((s) => s.removeItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const clearCart = useCartStore((s) => s.clearCart);
  const checkoutMutation = useCheckout();
  const [orderResult, setOrderResult] = useState<Record<string, unknown> | null>(null);
  const { data: ownedIds = [] } = useOwnedProductIds(user?.id);

  useEffect(() => {
    if (!ownedIds.length) return;
    const owned = new Set(ownedIds);
    const ownedInCart = items.filter((i) => owned.has(i.productId));
    if (!ownedInCart.length) return;
    for (const item of ownedInCart) {
      removeItem(item.productId);
    }
    notify.error('Removed already-owned products from your cart');
  }, [ownedIds, items, removeItem]);

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

  if (orderResult) {
    return (
      <div className="max-w-lg mx-auto text-center py-16 animate-slide-up">
        <div className="glass-panel p-10">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-500/15 border border-green-500/30 text-4xl mx-auto mb-6">
            ✓
          </div>
          <h2 className="text-2xl font-bold text-content mb-2">Order Placed!</h2>
          <p className="text-mist mb-6">
            {STATUS_LABEL[orderResult.status as string] ?? 'Payment is being processed.'}
          </p>
          <div className="rounded-xl bg-surface-elevated border border-surface-border p-4 mb-6 text-left space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-mist">Invoice</span>
              <span className="text-content font-mono">{orderResult.invoiceNo as string}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-mist">Status</span>
              <span className="text-brand-accent-deep font-medium">
                {STATUS_LABEL[orderResult.status as string] ?? (orderResult.status as string)}
              </span>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/orders" className="btn-primary">
              View My Orders
            </Link>
            <Link to="/" className="btn-secondary">
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon="🛒"
        title="Your cart is empty"
        description="Explore the marketplace and add digital comics, art, or assets to your cart."
        actionLabel="Browse Marketplace"
        actionTo="/"
      />
    );
  }

  const handleRemove = (productId: string, name: string) => {
    removeItem(productId);
    notify.success(`Removed "${name}" from cart`);
  };

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      <PageHeader title="Shopping Cart" subtitle={`${items.length} item${items.length > 1 ? 's' : ''} in your cart`} />

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => (
            <div
              key={item.productId}
              className="glass-panel p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4"
            >
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-surface-elevated border border-surface-border text-2xl">
                {TYPE_EMOJI[item.productType] ?? '📦'}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-content truncate">{item.productName}</h3>
                <p className="text-sm text-mist">{item.productType}</p>
              </div>
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="flex items-center rounded-xl border border-surface-border bg-surface-elevated">
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.productId, Math.max(1, item.quantity - 1))}
                    className="px-3 py-2 text-mist hover:text-content transition-colors"
                  >
                    −
                  </button>
                  <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                    className="px-3 py-2 text-mist hover:text-content transition-colors"
                  >
                    +
                  </button>
                </div>
                <span className="text-content font-bold w-20 text-right">
                  ${(item.price * item.quantity).toFixed(2)}
                </span>
                <button
                  type="button"
                  onClick={() => handleRemove(item.productId, item.productName)}
                  className="btn-ghost text-red-400 hover:text-red-300 hover:bg-red-500/10"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="lg:col-span-1">
          <div className="glass-panel p-6 sticky top-24">
            <h2 className="text-lg font-semibold text-content mb-4">Order Summary</h2>
            <div className="space-y-3 mb-6 pb-6 border-b border-surface-border">
              {items.map((item) => (
                <div key={item.productId} className="flex justify-between text-sm">
                  <span className="text-mist truncate mr-2">{item.productName} ×{item.quantity}</span>
                  <span className="text-content shrink-0">${(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between text-lg font-bold text-content mb-6">
              <span>Total</span>
              <span className="text-brand-accent-deep">${total.toFixed(2)}</span>
            </div>
            <FormEngine
              initialValues={{ confirmEmail: user?.email || '' }}
              validationSchema={checkoutSchema}
              fields={[
                { name: 'confirmEmail', label: 'Confirm Email', type: 'email', placeholder: user?.email },
              ]}
              submitLabel="Complete Checkout"
              onSubmit={async () => {
                const toastId = notify.loading('Processing checkout...');
                try {
                  const result = (await checkoutMutation.mutateAsync({
                    items: items.map((i) => ({
                      productId: i.productId,
                      productName: i.productName,
                      productType: i.productType,
                      price: i.price,
                      quantity: i.quantity,
                    })),
                  })) as Record<string, unknown>;
                  notify.dismiss(toastId);
                  clearCart();
                  if (typeof result.checkoutUrl === 'string' && result.checkoutUrl) {
                    notify.success('Redirecting to Stripe Checkout…');
                    window.location.href = result.checkoutUrl;
                    return;
                  }
                  notify.success('Checkout started! Track status in My Orders.');
                  setOrderResult(result);
                } catch (err) {
                  notify.dismiss(toastId);
                  const message = getApiErrorMessage(
                    err,
                    'Checkout failed. Please try again.',
                  );
                  notify.error(message);
                  if (message.includes('already own')) {
                    clearCart();
                  }
                }
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
