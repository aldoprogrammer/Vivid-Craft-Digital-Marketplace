import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const GUEST_CART_KEY = '__guest__';

export interface CartItem {
  productId: string;
  productName: string;
  productType: string;
  price: number;
  quantity: number;
}

const EMPTY_CART: CartItem[] = [];

interface CartState {
  activeUserId: string | null;
  cartsByUser: Record<string, CartItem[]>;
  setActiveUser: (userId: string | null) => void;
  getItems: () => CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  total: () => number;
  itemCount: () => number;
}

function cartKey(userId: string | null): string {
  return userId ?? GUEST_CART_KEY;
}

function normalizeCartsByUser(
  cartsByUser: Record<string, CartItem[]> | null | undefined,
): Record<string, CartItem[]> {
  if (!cartsByUser || typeof cartsByUser !== 'object') return {};
  return cartsByUser;
}

export function selectCartItems(state: CartState): CartItem[] {
  const carts = normalizeCartsByUser(state.cartsByUser);
  return carts[cartKey(state.activeUserId)] ?? EMPTY_CART;
}

export function selectCartItemCount(state: CartState): number {
  return selectCartItems(state).reduce((sum, item) => sum + item.quantity, 0);
}

export function selectCartTotal(state: CartState): number {
  return selectCartItems(state).reduce((sum, item) => sum + item.price * item.quantity, 0);
}

function updateUserCart(
  cartsByUser: Record<string, CartItem[]> | null | undefined,
  userId: string | null,
  updater: (items: CartItem[]) => CartItem[],
): Record<string, CartItem[]> {
  const carts = normalizeCartsByUser(cartsByUser);
  const key = cartKey(userId);
  const current = carts[key] ?? [];
  return { ...carts, [key]: updater(current) };
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      activeUserId: null,
      cartsByUser: {},

      setActiveUser: (userId) => set({ activeUserId: userId }),

      getItems: () => {
        const { activeUserId, cartsByUser } = get();
        return normalizeCartsByUser(cartsByUser)[cartKey(activeUserId)] ?? EMPTY_CART;
      },

      addItem: (item) =>
        set((state) => ({
          cartsByUser: updateUserCart(state.cartsByUser, state.activeUserId, (items) => {
            const existing = items.find((i) => i.productId === item.productId);
            if (existing) {
              return items.map((i) =>
                i.productId === item.productId
                  ? { ...i, quantity: i.quantity + item.quantity }
                  : i,
              );
            }
            return [...items, item];
          }),
        })),

      removeItem: (productId) =>
        set((state) => ({
          cartsByUser: updateUserCart(state.cartsByUser, state.activeUserId, (items) =>
            items.filter((i) => i.productId !== productId),
          ),
        })),

      updateQuantity: (productId, quantity) =>
        set((state) => ({
          cartsByUser: updateUserCart(state.cartsByUser, state.activeUserId, (items) =>
            items.map((i) => (i.productId === productId ? { ...i, quantity } : i)),
          ),
        })),

      clearCart: () =>
        set((state) => ({
          cartsByUser: updateUserCart(state.cartsByUser, state.activeUserId, () => []),
        })),

      total: () => {
        const items = get().getItems();
        return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      },

      itemCount: () => {
        const items = get().getItems();
        return items.reduce((sum, item) => sum + item.quantity, 0);
      },
    }),
    {
      name: 'vividcraft-cart',
      version: 2,
      migrate: (persisted) => {
        const state = persisted as Partial<CartState> & { items?: CartItem[] };
        let cartsByUser = normalizeCartsByUser(state.cartsByUser);

        if (Array.isArray(state.items) && state.items.length > 0) {
          const guestKey = GUEST_CART_KEY;
          cartsByUser = {
            ...cartsByUser,
            [guestKey]: [...(cartsByUser[guestKey] ?? []), ...state.items],
          };
        }

        return {
          activeUserId: state.activeUserId ?? null,
          cartsByUser,
        };
      },
      merge: (persisted, current) => {
        const saved = persisted as Partial<CartState> & { items?: CartItem[] };
        return {
          ...current,
          activeUserId: saved.activeUserId ?? current.activeUserId,
          cartsByUser: normalizeCartsByUser(saved.cartsByUser),
        };
      },
      onRehydrateStorage: () => (state) => {
        if (state && !state.cartsByUser) {
          state.cartsByUser = {};
        }
      },
      partialize: (state) => ({
        activeUserId: state.activeUserId,
        cartsByUser: state.cartsByUser,
      }),
    },
  ),
);
