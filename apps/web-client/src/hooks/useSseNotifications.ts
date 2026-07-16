import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { notify } from '@/lib/toast';
import type { Product } from '@/hooks/useApi';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export interface SseEvent {
  id: string;
  type: string;
  occurredAt: string;
  data: Record<string, unknown>;
}

function patchFavoriteCount(
  list: Product[] | undefined,
  productId: string,
  favoriteCount: number,
) {
  if (!list) return list;
  return list.map((p) => (p._id === productId ? { ...p, favoriteCount } : p));
}

export function useSseNotifications(userId: string | undefined) {
  const queryClient = useQueryClient();
  const accessToken = useAuthStore((s) => s.accessToken);
  const sourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!userId || !accessToken) return;

    const url = `${API_URL}/api/transactions/notifications/stream?token=${encodeURIComponent(accessToken)}`;
    const source = new EventSource(url);
    sourceRef.current = source;

    const invalidateOrders = () => {
      queryClient.invalidateQueries({ queryKey: ['orders', userId] });
      queryClient.invalidateQueries({ queryKey: ['purchases', userId] });
    };

    const refreshNotifications = () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    };

    const applyFavoriteCount = (productId: string, favoriteCount: number) => {
      queryClient.setQueriesData<Product[]>({ queryKey: ['products'] }, (list) =>
        patchFavoriteCount(list, productId, favoriteCount),
      );
      queryClient.setQueriesData<Product[]>({ queryKey: ['my-products'] }, (list) =>
        patchFavoriteCount(list, productId, favoriteCount),
      );
      queryClient.setQueriesData<Product[]>({ queryKey: ['creator-listings'] }, (list) =>
        patchFavoriteCount(list, productId, favoriteCount),
      );
      queryClient.setQueriesData<Product[]>({ queryKey: ['user-favorites'] }, (list) =>
        patchFavoriteCount(list, productId, favoriteCount),
      );
    };

    source.addEventListener('order.created', () => {
      invalidateOrders();
      refreshNotifications();
    });
    source.addEventListener('order.status_changed', () => {
      invalidateOrders();
      refreshNotifications();
    });

    source.addEventListener('product.favorite_count_changed', (event) => {
      try {
        const payload = JSON.parse((event as MessageEvent).data) as SseEvent;
        const productId = String(payload.data.productId ?? '');
        const favoriteCount = Number(payload.data.favoriteCount ?? 0);
        if (productId) {
          applyFavoriteCount(productId, favoriteCount);
        }
      } catch {
        // ignore malformed events
      }
    });

    source.addEventListener('product.favorited', (event) => {
      try {
        const payload = JSON.parse((event as MessageEvent).data) as SseEvent;
        const productName = String(payload.data.productName ?? 'your listing');
        const buyerEmail = String(payload.data.buyerEmail ?? 'A buyer');
        notify.success(`${buyerEmail} favorited "${productName}"`);
        queryClient.invalidateQueries({ queryKey: ['my-products'] });
        refreshNotifications();
      } catch {
        // ignore malformed events
      }
    });

    const handleReviewEvent = (event: Event, type: 'created' | 'replied') => {
      try {
        const payload = JSON.parse((event as MessageEvent).data) as SseEvent;
        const productName = String(payload.data.productName ?? 'a product');
        const productId = String(payload.data.productId ?? '');
        if (type === 'created') {
          const reviewerName = String(payload.data.reviewerName ?? 'A buyer');
          const rating = payload.data.rating;
          notify.success(`${reviewerName} left a ${rating}★ review on "${productName}"`);
        } else {
          const replierName = String(payload.data.replierName ?? 'Someone');
          notify.success(`${replierName} replied to your review on "${productName}"`);
        }
        if (productId) {
          queryClient.invalidateQueries({ queryKey: ['reviews', productId] });
        }
        refreshNotifications();
      } catch {
        // ignore malformed events
      }
    };

    source.addEventListener('review.created', (e) => handleReviewEvent(e, 'created'));
    source.addEventListener('review.replied', (e) => handleReviewEvent(e, 'replied'));

    source.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as SseEvent;
        if (payload.type === 'order.created' || payload.type === 'order.status_changed') {
          invalidateOrders();
          refreshNotifications();
        }
      } catch {
        // ignore malformed events
      }
    };

    return () => {
      source.close();
      sourceRef.current = null;
    };
  }, [userId, accessToken, queryClient]);
}
