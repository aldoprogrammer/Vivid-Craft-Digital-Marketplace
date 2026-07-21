export const PENDING_CHECKOUT_KEY = 'vividcraft-pending-checkout';

export function setPendingCheckoutOrderId(orderId: string) {
  sessionStorage.setItem(PENDING_CHECKOUT_KEY, orderId);
}

export function getPendingCheckoutOrderId(): string | null {
  return sessionStorage.getItem(PENDING_CHECKOUT_KEY);
}

export function clearPendingCheckoutOrderId() {
  sessionStorage.removeItem(PENDING_CHECKOUT_KEY);
}
