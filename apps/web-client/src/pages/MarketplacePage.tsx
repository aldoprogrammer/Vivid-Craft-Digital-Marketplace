import { useState } from 'react';
import {
  useFavoriteProductIds,
  useOwnedProductIds,
  useProducts,
  useToggleFavorite,
} from '@/hooks/useApi';
import { useCartStore } from '@/stores/cartStore';
import { useAuthStore } from '@/stores/authStore';
import { ProductCard, ProductCardSkeleton } from '@/components/ProductCard';
import { EmptyState } from '@/components/EmptyState';
import { notify } from '@/lib/toast';

const TYPE_OPTIONS = [
  { value: '', label: 'All types' },
  { value: 'COMIC', label: 'Comics' },
  { value: 'ART', label: 'Digital Art' },
  { value: 'ASSET', label: 'Assets' },
];

export function MarketplacePage() {
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');

  const filters = {
    ...(appliedSearch && { search: appliedSearch }),
    ...(type && { type }),
  };

  const { data: products, isLoading, error } = useProducts(filters);
  const { user, isAuthenticated } = useAuthStore();
  const isFan = isAuthenticated && user?.role === 'FAN';
  const { data: favoriteIds = [] } = useFavoriteProductIds(isFan);
  const { data: ownedIds = [] } = useOwnedProductIds(
    isAuthenticated && user?.role === 'FAN' ? user.id : undefined,
  );
  const ownedSet = new Set(ownedIds);
  const toggleFavorite = useToggleFavorite();
  const addItem = useCartStore((s) => s.addItem);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setAppliedSearch(search.trim());
  };

  const handleAddToCart = (product: {
    _id: string;
    title: string;
    type: 'COMIC' | 'ART' | 'ASSET';
    price: number;
  }) => {
    if (ownedSet.has(product._id)) {
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
  };

  const handleFavorite = async (productId: string, title: string) => {
    if (!isAuthenticated) {
      notify.error('Sign in as a buyer to save favorites');
      return;
    }
    if (!isFan) {
      notify.error('Favorites are available to buyer accounts');
      return;
    }

    try {
      const result = await toggleFavorite.mutateAsync(productId);
      notify.success(
        result.favorited
          ? `"${title}" added to favorites`
          : `"${title}" removed from favorites`,
      );
    } catch {
      notify.error('Could not update favorite');
    }
  };

  return (
    <div>
      <section className="on-solid relative mb-10 overflow-hidden rounded-3xl border border-white/10 bg-brand-primary p-8 sm:p-12 animate-fade-in">
        <div className="relative max-w-2xl">
          <span className="badge bg-brand-accent/20 text-brand-accent border border-brand-accent/30 mb-4">
            Digital Marketplace
          </span>
          <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight leading-tight mb-4">
            Discover art & comics from{' '}
            <span className="text-brand-highlight">
              creators worldwide
            </span>
          </h1>
          <p className="text-white/70 text-lg leading-relaxed">
            All preview images are protected with VividCraft watermarks via our Flask image processor.
          </p>
        </div>
      </section>

      <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3 mb-8">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search comics, art, creators..."
          className="input-field flex-1"
        />
        <select value={type} onChange={(e) => setType(e.target.value)} className="input-field sm:w-44">
          {TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <button type="submit" className="btn-primary sm:w-auto">Search</button>
      </form>

      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      )}

      {error && (
        <EmptyState
          icon="⚠️"
          title="Couldn't load products"
          description="Make sure Docker services are running, then refresh the page."
        />
      )}

      {!isLoading && !error && products?.length === 0 && (
        <EmptyState
          icon="🎨"
          title="No listings found"
          description={appliedSearch || type ? 'Try different search filters.' : 'Be the first creator to publish on VividCraft.'}
          actionLabel={!appliedSearch && !type ? 'Create a listing' : undefined}
          actionTo="/dashboard"
        />
      )}

      {!isLoading && !error && products && products.length > 0 && (
        <>
          <p className="text-sm text-mist mb-6">
            <span className="text-content font-semibold">{products.length}</span> result{products.length !== 1 ? 's' : ''}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product, index) => (
              <ProductCard
                key={product._id}
                productId={product._id}
                creatorId={product.creatorId}
                title={product.title}
                description={product.description}
                type={product.type}
                price={product.price}
                creatorName={product.creatorName}
                previewImageUrl={product.previewImageUrl}
                isWatermarked={Boolean(product.watermarkedImagePath)}
                index={index}
                onAddToCart={() => handleAddToCart(product)}
                onFavorite={() => handleFavorite(product._id, product.title)}
                isFavorite={favoriteIds.includes(product._id)}
                favoriteCount={product.favoriteCount ?? 0}
                favoritePending={toggleFavorite.isPending}
                alreadyOwned={ownedSet.has(product._id)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
