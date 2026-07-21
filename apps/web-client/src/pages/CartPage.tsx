import { useEffect, useRef } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { useAuthStore } from '@/stores/authStore';
import { useAuthHydrated } from '@/hooks/useAuthHydrated';
import { useCartStore, selectCartItems, selectCartTotal } from '@/stores/cartStore';
import { useAbandonCheckout, useOwnedProductIds } from '@/hooks/useApi';
import {
  clearPendingCheckoutOrderId,
  getPendingCheckoutOrderId,
} from '@/lib/checkoutSession';
import { notify } from '@/lib/toast';

const TYPE_EMOJI: Record<string, string> = { COMIC: '📚', ART: '🎨', ASSET: '📦' };

export function CartPage() {
  const hydrated = useAuthHydrated();
  const { user, isAuthenticated } = useAuthStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const items = useCartStore(selectCartItems);
  const total = useCartStore(selectCartTotal);
  const removeItem = useCartStore((s) => s.removeItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const { data: ownedIds = [] } = useOwnedProductIds(user?.id);
  const abandonCheckout = useAbandonCheckout();
  const prunedOwnedRef = useRef<string>('');

  useEffect(() => {
    if (searchParams.get('cancelled') !== '1') return;

    let active = true;
    void (async () => {
      const orderId = getPendingCheckoutOrderId();
      if (orderId) {
        try {
          await abandonCheckout.mutateAsync(orderId);
        } catch {
          /* order may already be failed */
        }
        clearPendingCheckoutOrderId();
      }
      if (!active) return;
      notify.info('Payment cancelled. Your cart is unchanged.');
      setSearchParams({}, { replace: true });
    })();

    return () => {
      active = false;
    };
  }, [searchParams, setSearchParams, abandonCheckout]);

  useEffect(() => {
    if (!ownedIds.length || !items.length) return;

    const owned = new Set(ownedIds);
    const ownedInCart = items.filter((i) => owned.has(i.productId));
    if (!ownedInCart.length) return;

    const fingerprint = ownedInCart.map((i) => i.productId).sort().join(',');
    if (prunedOwnedRef.current === fingerprint) return;
    prunedOwnedRef.current = fingerprint;

    for (const item of ownedInCart) {
      removeItem(item.productId);
    }

    if (ownedInCart.length === 1) {
      notify.info(`"${ownedInCart[0].productName}" is already in your Library — removed from cart.`);
    } else {
      notify.info(`${ownedInCart.length} items already in your Library — removed from cart.`);
    }
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
            <Link to="/checkout" className="btn-primary w-full text-center block py-3">
              Proceed to checkout
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
