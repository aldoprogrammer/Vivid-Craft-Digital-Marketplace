import { useNavigate } from 'react-router-dom';
import { useCartStore, type CartItem } from '@/stores/cartStore';
import { useAuthStore } from '@/stores/authStore';
import { notify } from '@/lib/toast';

export function useAddToCart() {
  const navigate = useNavigate();
  const addItem = useCartStore((s) => s.addItem);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return (item: CartItem, productTitle: string) => {
    if (!isAuthenticated) {
      notify.error('Sign in to add items to cart');
      navigate('/login');
      return false;
    }

    addItem(item);
    notify.success(`"${productTitle}" added to cart`);
    return true;
  };
}
