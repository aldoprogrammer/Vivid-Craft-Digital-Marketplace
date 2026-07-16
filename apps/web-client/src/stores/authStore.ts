import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useCartStore } from './cartStore';

export type UserRole = 'CREATOR' | 'FAN' | 'ADMIN';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  bio?: string | null;
  avatarUrl?: string | null;
  bannerUrl?: string | null;
  website?: string | null;
  twitter?: string | null;
  instagram?: string | null;
  discord?: string | null;
}

export interface PublicUser {
  id: string;
  name: string;
  role: UserRole;
  bio?: string | null;
  avatarUrl?: string | null;
  bannerUrl?: string | null;
  website?: string | null;
  twitter?: string | null;
  instagram?: string | null;
  discord?: string | null;
  createdAt?: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  updateUser: (user: Partial<User>) => void;
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
      setTokens: (accessToken, refreshToken) => {
        set({ accessToken, refreshToken, isAuthenticated: true });
      },
      updateUser: (patch) => {
        set((state) => ({
          user: state.user ? { ...state.user, ...patch } : null,
        }));
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
