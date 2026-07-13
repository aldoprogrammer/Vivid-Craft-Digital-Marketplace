import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';

export interface Product {
  _id: string;
  title: string;
  description: string;
  type: 'COMIC' | 'ART' | 'ASSET';
  price: number;
  creatorId: string;
  creatorName: string;
  categories: string[];
  tags: string[];
  previewImageUrl?: string;
  watermarkedImagePath?: string;
  isPublished: boolean;
}

export interface Category {
  _id: string;
  name: string;
  description?: string;
}

export interface Order {
  id: string;
  invoiceNo: string;
  status: string;
  totalAmount: string;
  createdAt: string;
  items: { productName: string; productType: string; price: string; quantity: number }[];
  payment?: { status: string; transactionId: string };
}

export interface ProductFilters {
  search?: string;
  type?: string;
  category?: string;
  tag?: string;
}

export function useProducts(filters: ProductFilters = {}) {
  return useQuery({
    queryKey: ['products', filters],
    queryFn: async () => {
      const { data } = await apiClient.get<Product[]>('/api/marketplace/products', {
        params: filters,
      });
      return data;
    },
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data } = await apiClient.get<Category[]>('/api/marketplace/categories');
      return data;
    },
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (product: Record<string, unknown>) => {
      const { data } = await apiClient.post('/api/marketplace/products', product);
      return data as Product;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useWatermarkProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ productId, file }: { productId: string; file: File }) => {
      const formData = new FormData();
      formData.append('image', file);
      const { data } = await apiClient.post(
        `/api/marketplace/products/${productId}/watermark`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      return data as Product;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useOrders(userId: string | undefined) {
  return useQuery({
    queryKey: ['orders', userId],
    queryFn: async () => {
      const { data } = await apiClient.get<Order[]>('/api/transactions/orders', {
        params: { userId },
      });
      return data;
    },
    enabled: !!userId,
    refetchInterval: 5000,
  });
}

export function useLogin() {
  return useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      const { data } = await apiClient.post('/api/auth/login', credentials);
      return data;
    },
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: async (payload: {
      email: string;
      password: string;
      name: string;
      role: string;
    }) => {
      const { data } = await apiClient.post('/api/auth/register', payload);
      return data;
    },
  });
}

export function useCheckout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      userId: string;
      userEmail: string;
      items: {
        productId: string;
        productName: string;
        productType: string;
        price: number;
        quantity: number;
      }[];
    }) => {
      const { data } = await apiClient.post('/api/transactions/checkout', payload);
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['orders', variables.userId] });
    },
  });
}
