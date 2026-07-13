import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useCartStore } from './cartStore';

export type UserRole = 'CREATOR' | 'FAN' | 'ADMIN';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      setAuth: (user, accessToken, refreshToken) => {
        useCartStore.getState().setActiveUser(user.id);
        set({ user, accessToken, refreshToken, isAuthenticated: true });
      },
      logout: () => {
        useCartStore.getState().setActiveUser(null);
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        });
      },
    }),
    { name: 'vividcraft-auth' },
  ),
);

// Re-sync cart when app loads with persisted auth session
export function syncCartWithAuth() {
  const user = useAuthStore.getState().user;
  useCartStore.getState().setActiveUser(user?.id ?? null);
}
