import { Link } from 'react-router-dom';
import { ProductCard } from '@/components/ProductCard';
import { useCartStore } from '@/stores/cartStore';
import { useAuthStore } from '@/stores/authStore';
import { useOwnedProductIds } from '@/hooks/useApi';
import { notify } from '@/lib/toast';
import type { Product } from '@/hooks/useApi';

interface ProfileProductGridProps {
  products: Product[];
  topProductIds?: string[];
  emptyTitle: string;
  emptyDescription: string;
}

export function ProfileProductGrid({
  products,
  topProductIds = [],
  emptyTitle,
  emptyDescription,
}: ProfileProductGridProps) {
  const addItem = useCartStore((s) => s.addItem);
  const user = useAuthStore((s) => s.user);
  const { data: ownedIds = [] } = useOwnedProductIds(
    user?.role === 'FAN' ? user.id : undefined,
  );
  const ownedSet = new Set(ownedIds);

  if (!products.length) {
    return (
      <div className="glass-panel p-8 text-center">
        <p className="text-content font-medium">{emptyTitle}</p>
        <p className="text-sm text-mist mt-1">{emptyDescription}</p>
      </div>
    );
  }

  const topSet = new Set(topProductIds);
  const sorted = [...products].sort((a, b) => {
    const aTop = topSet.has(a._id) ? 0 : 1;
    const bTop = topSet.has(b._id) ? 0 : 1;
    if (aTop !== bTop) return aTop - bTop;
    const aIndex = topProductIds.indexOf(a._id);
    const bIndex = topProductIds.indexOf(b._id);
    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
    return 0;
  });

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {sorted.map((product, index) => {
        const owned = ownedSet.has(product._id);
        return (
          <div key={product._id} className="relative">
            {topSet.has(product._id) && (
              <span className="absolute top-3 left-3 z-10 badge border border-amber-400/40 text-amber-300 bg-amber-500/20">
                Best seller
              </span>
            )}
            <ProductCard
              productId={product._id}
              creatorId={product.creatorId}
              title={product.title}
              description={product.description}
              type={product.type}
              price={product.price}
              creatorName={product.creatorName}
              previewImageUrl={product.previewImageUrl}
              favoriteCount={product.favoriteCount ?? 0}
              alreadyOwned={owned}
              index={index}
              onAddToCart={() => {
                if (owned) {
                  notify.error('You already own this product');
                  return;
                }
                addItem({
                  productId: product._id,
                  productName: product.title,
                  productType: product.type,
                  price: product.price,
                  quantity: 1,
                });
                notify.success(`"${product.title}" added to cart`);
              }}
            />
          </div>
        );
      })}
    </div>
  );
}

interface ProfileLibraryListProps {
  items: { id: string; productId: string; productName: string; productType: string; deliveredAt: string }[];
}

export function ProfileLibraryList({ items }: ProfileLibraryListProps) {
  if (!items.length) {
    return (
      <div className="glass-panel p-8 text-center">
        <p className="text-content font-medium">No owned digital goods yet</p>
        <p className="text-sm text-mist mt-1">Purchases appear here after checkout completes.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {items.map((item) => (
        <div key={item.id} className="glass-panel p-4 flex flex-col gap-3">
          <div>
            <h3 className="font-semibold text-content">{item.productName}</h3>
            <p className="text-xs text-mist mt-1">{item.productType}</p>
          </div>
          <div className="flex flex-wrap gap-2 mt-auto">
            <Link
              to={`/products/${item.productId}/reviews`}
              className="btn-secondary py-2 px-3 text-xs"
            >
              Reviews
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}
