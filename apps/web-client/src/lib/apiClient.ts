import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/stores/authStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshPromise: Promise<boolean> | null = null;

export async function refreshAccessToken(): Promise<boolean> {
  const { refreshToken, setTokens, logout } = useAuthStore.getState();
  if (!refreshToken) {
    logout();
    return false;
  }

  try {
    const { data } = await axios.post(
      `${API_URL}/api/auth/refresh`,
      { refreshToken },
      { headers: { 'Content-Type': 'application/json' } },
    );
    setTokens(data.accessToken, data.refreshToken);
    return true;
  } catch {
    logout();
    return false;
  }
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    const url = original?.url ?? '';
    const isAuthRefresh = url.includes('/auth/refresh') || url.includes('/api/auth/refresh');

    if (error.response?.status === 403) {
      const { notify } = await import('@/lib/toast');
      notify.error('You do not have permission to perform this action');
      return Promise.reject(error);
    }

    if (error.response?.status !== 401 || !original || original._retry || isAuthRefresh) {
      return Promise.reject(error);
    }

    original._retry = true;

    if (!refreshPromise) {
      refreshPromise = refreshAccessToken().finally(() => {
        refreshPromise = null;
      });
    }

    const ok = await refreshPromise;
    if (!ok) {
      return Promise.reject(error);
    }

    original.headers.Authorization = `Bearer ${useAuthStore.getState().accessToken}`;
    return apiClient(original);
  },
);
