import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { useAuthStore } from '@/stores/authStore';
import { useAuthHydrated } from '@/hooks/useAuthHydrated';
import { useCartStore, selectCartItems, selectCartTotal } from '@/stores/cartStore';
import {
  useCheckout,
  useCheckoutOptions,
  useAbandonCheckout,
  type PaymentProviderId,
} from '@/hooks/useApi';
import { convertFromUsd, formatMoney } from '@/lib/money';
import { getApiErrorMessage } from '@/lib/errors';
import {
  clearPendingCheckoutOrderId,
  getPendingCheckoutOrderId,
  setPendingCheckoutOrderId,
} from '@/lib/checkoutSession';
import { notify } from '@/lib/toast';

const TYPE_EMOJI: Record<string, string> = { COMIC: '📚', ART: '🎨', ASSET: '📦' };

export function CheckoutPage() {
  const hydrated = useAuthHydrated();
  const { user, isAuthenticated } = useAuthStore();
  const items = useCartStore(selectCartItems);
  const totalUsd = useCartStore(selectCartTotal);
  const checkoutMutation = useCheckout();
  const abandonCheckout = useAbandonCheckout();
  const { data: options, isLoading } = useCheckoutOptions();

  const [provider, setProvider] = useState<PaymentProviderId | null>(null);
  const [email, setEmail] = useState(user?.email ?? '');
  const [redirecting, setRedirecting] = useState<{
    active: boolean;
    label: string;
  }>({ active: false, label: '' });

  const isBusy = checkoutMutation.isPending || redirecting.active;

  const usdToIdr = options?.usdToIdr ?? 16000;
  const methods = options?.methods ?? [];

  const selectedMethod = useMemo(
    () => methods.find((m) => m.id === provider) ?? null,
    [methods, provider],
  );
  const currency = selectedMethod?.currency ?? 'IDR';
  const chargeTotal = convertFromUsd(totalUsd, currency, usdToIdr);

  useEffect(() => {
    if (user?.email) setEmail(user.email);
  }, [user?.email]);

  useEffect(() => {
    if (!methods.length) {
      setProvider(null);
      return;
    }
    setProvider((prev) => {
      if (prev && methods.some((m) => m.id === prev)) return prev;
      return methods[0].id;
    });
  }, [methods]);

  if (!hydrated || isLoading) {
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
    return <Navigate to="/cart" replace />;
  }

  const handlePay = async () => {
    if (!provider || !selectedMethod) {
      notify.error('Select a payment method');
      return;
    }
    if (!email.trim()) {
      notify.error('Email is required');
      return;
    }

    const providerLabel =
      provider === 'XENDIT' ? 'Xendit' : provider === 'STRIPE' ? 'Stripe' : 'payment page';
    setRedirecting({ active: true, label: providerLabel });

    try {
      const pendingId = getPendingCheckoutOrderId();
      if (pendingId) {
        try {
          await abandonCheckout.mutateAsync(pendingId);
        } catch {
          /* previous session may already be closed */
        }
        clearPendingCheckoutOrderId();
      }

      const result = (await checkoutMutation.mutateAsync({
        checkoutCurrency: selectedMethod.currency,
        paymentProvider: provider,
        items: items.map((i) => ({
          productId: i.productId,
          productName: i.productName,
          productType: i.productType,
          price: i.price,
          quantity: i.quantity,
        })),
      })) as Record<string, unknown>;

      if (typeof result.checkoutUrl === 'string' && result.checkoutUrl) {
        if (typeof result.orderId === 'string') {
          setPendingCheckoutOrderId(result.orderId);
        }
        window.location.href = result.checkoutUrl;
        return;
      }

      setRedirecting({ active: false, label: '' });
      notify.success('Checkout started! Track status in My Orders.');
    } catch (err) {
      setRedirecting({ active: false, label: '' });
      notify.error(getApiErrorMessage(err, 'Payment could not be completed. Please try again.'));
    }
  };

  const providerLabel =
    provider === 'XENDIT' ? 'Xendit' : provider === 'STRIPE' ? 'Stripe' : 'payment provider';

  return (
    <div className="max-w-6xl mx-auto animate-fade-in relative">
      {redirecting.active && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/85 backdrop-blur-sm px-4"
          aria-live="polite"
          aria-busy="true"
        >
          <div className="glass-panel w-full max-w-md p-8 space-y-6 animate-slide-up">
            <div className="flex justify-center">
              <div className="h-14 w-14 animate-spin rounded-full border-[3px] border-brand-accent/30 border-t-brand-accent" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold text-content">Preparing secure checkout</h3>
              <p className="text-sm text-mist">
                {checkoutMutation.isPending
                  ? 'Creating your payment session…'
                  : `Opening ${redirecting.label}…`}
              </p>
            </div>
            <div className="space-y-3 animate-pulse" aria-hidden="true">
              <div className="h-3 rounded-full bg-surface-elevated" />
              <div className="h-3 w-4/5 mx-auto rounded-full bg-surface-elevated" />
              <div className="h-12 rounded-xl bg-surface-elevated mt-4" />
              <div className="grid grid-cols-3 gap-2">
                <div className="h-8 rounded-lg bg-surface-elevated" />
                <div className="h-8 rounded-lg bg-surface-elevated" />
                <div className="h-8 rounded-lg bg-surface-elevated" />
              </div>
            </div>
            <p className="text-center text-xs text-mist">
              Do not close this page — you will be redirected to {redirecting.label} shortly.
            </p>
          </div>
        </div>
      )}

      <PageHeader title="Checkout" subtitle="Choose how you want to pay — you can switch anytime" />

      <div className="grid lg:grid-cols-5 gap-8">
        <div className="lg:col-span-3 space-y-6">
          <section className="glass-panel p-6">
            <h2 className="text-sm font-semibold text-content mb-1">Payment method</h2>
            <p className="text-xs text-mist mb-4">
              Pick the option that fits you best. Your provider handles the final charge.
            </p>
            {methods.length === 0 ? (
              <p className="text-sm text-mist">No payment methods available right now.</p>
            ) : (
              <div className="space-y-3">
                {methods.map((method) => (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => setProvider(method.id)}
                    disabled={isBusy}
                    className={`w-full text-left flex flex-col gap-1 rounded-xl border px-4 py-4 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                      provider === method.id
                        ? 'border-brand-accent bg-brand-highlight/10 text-content'
                        : 'border-surface-border bg-surface-elevated text-mist hover:border-brand-secondary hover:text-content'
                    }`}
                  >
                    <span className="text-sm font-semibold text-content">{method.label}</span>
                    <span className="text-xs text-mist leading-snug">{method.description}</span>
                    <span className="flex flex-wrap gap-1.5 mt-2">
                      {method.channels.map((ch) => (
                        <span
                          key={ch}
                          className="rounded-md border border-surface-border bg-surface px-2 py-0.5 text-[10px] font-medium text-mist"
                        >
                          {ch}
                        </span>
                      ))}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="glass-panel p-6">
            <h2 className="text-sm font-semibold text-content mb-4">Order items</h2>
            <div className="space-y-3">
              {items.map((item) => {
                const lineUsd = item.price * item.quantity;
                const lineCharge = convertFromUsd(lineUsd, currency, usdToIdr);
                return (
                  <div
                    key={item.productId}
                    className="flex items-center gap-4 rounded-xl border border-surface-border bg-surface-elevated p-4"
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-surface text-xl">
                      {TYPE_EMOJI[item.productType] ?? '📦'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-content truncate">{item.productName}</p>
                      <p className="text-xs text-mist">
                        {item.productType} × {item.quantity}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-brand-accent-deep shrink-0">
                      {formatMoney(lineCharge, currency)}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        <div className="lg:col-span-2">
          <div className="glass-panel p-6 sticky top-24 space-y-6">
            <div>
              <label htmlFor="checkout-email" className="block text-sm font-semibold text-content mb-2">
                Email
              </label>
              <input
                id="checkout-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isBusy}
                className="w-full rounded-xl border border-surface-border bg-surface-elevated px-4 py-2.5 text-content text-sm focus:border-brand-accent focus:outline-none disabled:opacity-50"
                placeholder="you@example.com"
              />
            </div>

            <div className="border-t border-surface-border pt-4 space-y-2">
              <div className="flex justify-between text-sm text-mist">
                <span>Subtotal</span>
                <span className="text-content">{formatMoney(chargeTotal, currency)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold text-content">
                <span>Total</span>
                <span className="text-brand-accent-deep">{formatMoney(chargeTotal, currency)}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handlePay}
              disabled={isBusy || !provider}
              className="btn-primary w-full py-3 text-base disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isBusy ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  {checkoutMutation.isPending ? 'Preparing…' : `Opening ${providerLabel}…`}
                </>
              ) : (
                <>Pay {formatMoney(chargeTotal, currency)}</>
              )}
            </button>

            <Link
              to="/cart"
              className={`block text-center text-sm text-mist hover:text-content ${isBusy ? 'pointer-events-none opacity-50' : ''}`}
            >
              ← Back to cart
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
