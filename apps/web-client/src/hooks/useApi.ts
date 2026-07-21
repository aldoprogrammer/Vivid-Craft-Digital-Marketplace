import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import type { PublicUser, User } from '@/stores/authStore';

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
  downloadCount?: number;
  favoriteCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreatorAnalytics {
  revenue: number;
  totalSales: number;
  salesByType: Record<string, number>;
  salesByMonth: { month: string; revenue: number; sales: number }[];
  recentSales: {
    productName: string;
    productType: string;
    price: number;
    quantity: number;
    invoiceNo: string;
    soldAt: string;
  }[];
  topProducts: {
    productId: string;
    productName: string;
    sales: number;
    revenue: number;
  }[];
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
  items: {
    id?: string;
    productId?: string;
    productName: string;
    productType: string;
    price: string;
    quantity: number;
  }[];
  payment?: { status: string; transactionId: string };
}

export interface Purchase {
  id: string;
  productId: string;
  productName: string;
  productType: string;
  invoiceNo: string;
  orderId: string;
  downloadToken: string;
  downloadUrl: string;
  downloadCount: number;
  hasAsset?: boolean;
  assetFileName?: string | null;
  deliveredAt: string;
  lastDownloadAt?: string | null;
}

export interface ReviewNode {
  id: string;
  productId: string;
  productName: string;
  creatorId: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  rating: number | null;
  comment: string;
  parentId: string | null;
  createdAt: string;
  replies: ReviewNode[];
}

export interface ProductReviewsResponse {
  productId: string;
  productName: string;
  reviewCount: number;
  averageRating: number;
  reviews: ReviewNode[];
}

export interface ReviewEligibility {
  productId: string;
  productName: string;
  creatorId: string;
  ownsProduct: boolean;
  isCreator: boolean;
  hasReviewed: boolean;
  canReview: boolean;
  canReply: boolean;
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

export function useFavoriteProductIds(enabled: boolean) {
  return useQuery({
    queryKey: ['favorite-products'],
    queryFn: async () => {
      const { data } = await apiClient.get<string[]>(
        '/api/marketplace/products/favorites/mine',
      );
      return data;
    },
    enabled,
  });
}

export function useToggleFavorite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (productId: string) => {
      const { data } = await apiClient.post<{
        favorited: boolean;
        favoriteCount: number;
      }>(`/api/marketplace/products/${productId}/favorite`);
      return { productId, ...data };
    },
    onSuccess: ({ productId, favorited, favoriteCount }) => {
      const patchCount = (list: Product[] | undefined) => {
        if (!list) return list;
        return list.map((p) =>
          p._id === productId ? { ...p, favoriteCount } : p,
        );
      };

      queryClient.setQueriesData<Product[]>({ queryKey: ['products'] }, patchCount);
      queryClient.setQueriesData<Product[]>({ queryKey: ['my-products'] }, patchCount);
      queryClient.setQueriesData<Product[]>({ queryKey: ['creator-listings'] }, patchCount);
      queryClient.setQueriesData<Product[]>({ queryKey: ['user-favorites'] }, patchCount);

      queryClient.setQueryData<string[]>(['favorite-products'], (ids) => {
        const current = ids ?? [];
        if (favorited) {
          return current.includes(productId) ? current : [...current, productId];
        }
        return current.filter((id) => id !== productId);
      });
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
      queryClient.invalidateQueries({ queryKey: ['my-products'] });
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
      queryClient.invalidateQueries({ queryKey: ['my-products'] });
    },
  });
}

export function useUploadProductAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ productId, file }: { productId: string; file: File }) => {
      const formData = new FormData();
      formData.append('asset', file);
      const { data } = await apiClient.post(
        `/api/marketplace/products/${productId}/assets`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      return data as Product;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['my-products'] });
    },
  });
}

export function useMyProducts(enabled: boolean) {
  return useQuery({
    queryKey: ['my-products'],
    queryFn: async () => {
      const { data } = await apiClient.get<Product[]>('/api/marketplace/products/mine');
      return data;
    },
    enabled,
  });
}

export function useCreatorAnalytics(enabled: boolean) {
  return useQuery({
    queryKey: ['creator-analytics'],
    queryFn: async () => {
      const { data } = await apiClient.get<CreatorAnalytics>('/api/transactions/creator/analytics');
      return data;
    },
    enabled,
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: { id: string } & Record<string, unknown>) => {
      const { data } = await apiClient.put(`/api/marketplace/products/${id}`, payload);
      return data as Product;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['my-products'] });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/api/marketplace/products/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['my-products'] });
    },
  });
}

export function useOrders(userId: string | undefined) {
  return useQuery({
    queryKey: ['orders', userId],
    queryFn: async () => {
      const { data } = await apiClient.get<Order[]>('/api/transactions/orders');
      return data;
    },
    enabled: !!userId,
  });
}

export function usePurchases(userId: string | undefined) {
  return useQuery({
    queryKey: ['purchases', userId],
    queryFn: async () => {
      const { data } = await apiClient.get<Purchase[]>('/api/transactions/purchases');
      return data;
    },
    enabled: !!userId,
  });
}

export function useOwnedProductIds(userId: string | undefined) {
  return useQuery({
    queryKey: ['owned-product-ids', userId],
    queryFn: async () => {
      const { data } = await apiClient.get<string[]>('/api/transactions/purchases/owned-ids');
      return data;
    },
    enabled: !!userId,
  });
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  bio?: string | null;
}

export interface AdminOrder {
  id: string;
  invoiceNo: string;
  userEmail: string;
  totalAmount: string | number;
  status: string;
  createdAt: string;
}

export function useAdminUsers(enabled: boolean) {
  return useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data } = await apiClient.get<AdminUser[]>('/api/users');
      return data;
    },
    enabled,
  });
}

export function useAdminOrders(enabled: boolean) {
  return useQuery({
    queryKey: ['admin-orders'],
    queryFn: async () => {
      const { data } = await apiClient.get<AdminOrder[]>('/api/transactions/orders/admin/all');
      return data;
    },
    enabled,
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

export function useCheckoutOptions() {
  return useQuery({
    queryKey: ['checkout-options'],
    queryFn: async () => {
      const { data } = await apiClient.get<CheckoutOptions>(
        '/api/transactions/checkout/options',
      );
      return data;
    },
    staleTime: 60_000,
  });
}

export function usePaymentMethods() {
  const { data } = useCheckoutOptions();
  return {
    data: data?.methods,
    isLoading: !data,
  };
}

export type PaymentProviderId = 'STRIPE' | 'XENDIT' | 'SIMULATED';
export type CheckoutCurrencyCode = 'USD' | 'IDR';

export interface CheckoutCurrencyOption {
  code: CheckoutCurrencyCode;
  label: string;
  symbol: string;
  flag: string;
  hint?: string;
}

export interface PaymentMethod {
  id: PaymentProviderId;
  currency: CheckoutCurrencyCode;
  label: string;
  description: string;
  channels: string[];
}

export interface CheckoutOptions {
  currencies: CheckoutCurrencyOption[];
  methods: PaymentMethod[];
  usdToIdr: number;
}

export function useCheckout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      checkoutCurrency: CheckoutCurrencyCode;
      paymentProvider: PaymentProviderId;
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
    },
  });
}

export function useAbandonCheckout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (orderId: string) => {
      const { data } = await apiClient.post(
        `/api/transactions/checkout/${orderId}/abandon`,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['owned-product-ids'] });
    },
  });
}

export function useResumePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (orderId: string) => {
      const { data } = await apiClient.post<{
        orderId: string;
        status: string;
        checkoutUrl: string | null;
      }>(`/api/transactions/checkout/${orderId}/resume`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      queryClient.invalidateQueries({ queryKey: ['owned-product-ids'] });
    },
  });
}

export function useConfirmPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (orderId: string) => {
      const { data } = await apiClient.post<{ orderId: string; status: string; confirmed: boolean }>(
        `/api/transactions/checkout/${orderId}/confirm`,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      queryClient.invalidateQueries({ queryKey: ['owned-product-ids'] });
    },
  });
}

export function useProductReviews(productId: string | undefined) {
  return useQuery({
    queryKey: ['reviews', productId],
    queryFn: async () => {
      const { data } = await apiClient.get<ProductReviewsResponse>(
        `/api/transactions/reviews/product/${productId}`,
      );
      return data;
    },
    enabled: !!productId,
  });
}

export function useReviewEligibility(productId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ['review-eligibility', productId],
    queryFn: async () => {
      const { data } = await apiClient.get<ReviewEligibility>(
        `/api/transactions/reviews/product/${productId}/eligibility`,
      );
      return data;
    },
    enabled: !!productId && enabled,
  });
}

export function useCreateReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { productId: string; rating: number; comment: string }) => {
      const { data } = await apiClient.post('/api/transactions/reviews', payload);
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['reviews', variables.productId] });
      queryClient.invalidateQueries({ queryKey: ['review-eligibility', variables.productId] });
    },
  });
}

export interface ProfileLibraryItem {
  id: string;
  productId: string;
  productName: string;
  productType: string;
  deliveredAt: string;
}

export interface ProfileTopProduct {
  productId: string;
  productName: string;
  sales: number;
  revenue: number;
}

export function usePublicProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ['profile', userId],
    queryFn: async () => {
      const { data } = await apiClient.get<PublicUser>(`/api/users/${userId}/public`);
      return data;
    },
    enabled: !!userId,
  });
}

export function useMyProfile(enabled: boolean) {
  return useQuery({
    queryKey: ['my-profile'],
    queryFn: async () => {
      const { data } = await apiClient.get<User>('/api/users/me');
      return data;
    },
    enabled,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      name?: string;
      bio?: string;
      website?: string;
      twitter?: string;
      instagram?: string;
      discord?: string;
    }) => {
      const { data } = await apiClient.patch<User>('/api/users/me', payload);
      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['my-profile'], data);
      queryClient.invalidateQueries({ queryKey: ['profile', data.id] });
    },
  });
}

export function useUploadProfileImage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ kind, file }: { kind: 'avatar' | 'banner'; file: File }) => {
      const formData = new FormData();
      formData.append('image', file);
      const { data } = await apiClient.post<User>(
        `/api/users/me/${kind}`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['my-profile'], data);
      queryClient.invalidateQueries({ queryKey: ['profile', data.id] });
    },
  });
}

export function useCreatorListings(creatorId: string | undefined) {
  return useQuery({
    queryKey: ['creator-listings', creatorId],
    queryFn: async () => {
      const { data } = await apiClient.get<Product[]>(
        `/api/marketplace/products/creator/${creatorId}/listings`,
      );
      return data;
    },
    enabled: !!creatorId,
  });
}

export function useUserFavorites(userId: string | undefined) {
  return useQuery({
    queryKey: ['user-favorites', userId],
    queryFn: async () => {
      const { data } = await apiClient.get<Product[]>(
        `/api/marketplace/products/favorites/user/${userId}`,
      );
      return data;
    },
    enabled: !!userId,
  });
}

export function useProfileLibrary(userId: string | undefined) {
  return useQuery({
    queryKey: ['profile-library', userId],
    queryFn: async () => {
      const { data } = await apiClient.get<ProfileLibraryItem[]>(
        `/api/transactions/profile/${userId}/library`,
      );
      return data;
    },
    enabled: !!userId,
  });
}

export function useProfileTopProducts(userId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ['profile-top-products', userId],
    queryFn: async () => {
      const { data } = await apiClient.get<ProfileTopProduct[]>(
        `/api/transactions/profile/${userId}/top-products`,
      );
      return data;
    },
    enabled: !!userId && enabled,
  });
}

export function useReplyReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { parentId: string; comment: string }) => {
      const { data } = await apiClient.post(
        `/api/transactions/reviews/${payload.parentId}/reply`,
        { comment: payload.comment },
      );
      return data;
    },
    onSuccess: (data: { productId?: string }) => {
      if (data?.productId) {
        queryClient.invalidateQueries({ queryKey: ['reviews', data.productId] });
      } else {
        queryClient.invalidateQueries({ queryKey: ['reviews'] });
      }
    },
  });
}

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  linkPath: string | null;
  read: boolean;
  readAt: string | null;
  createdAt: string;
  payload?: Record<string, unknown>;
}

export interface NotificationListResponse {
  items: AppNotification[];
  unreadCount: number;
}

export function useNotifications() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const { data } = await apiClient.get<NotificationListResponse>(
        '/api/transactions/notifications',
      );
      return data;
    },
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await apiClient.patch<AppNotification>(
        `/api/transactions/notifications/${id}/read`,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.patch<{ updated: number }>(
        '/api/transactions/notifications/read-all',
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
