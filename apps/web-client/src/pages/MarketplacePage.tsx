import { useState } from 'react';
import { useProducts } from '@/hooks/useApi';
import { useCartStore } from '@/stores/cartStore';
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
    addItem({
      productId: product._id,
      productName: product.title,
      productType: product.type,
      price: product.price,
      quantity: 1,
    });
    notify.success(`"${product.title}" added to cart`);
  };

  return (
    <div>
      <section className="relative mb-10 overflow-hidden rounded-3xl border border-surface-border bg-gradient-to-br from-vivid-900/40 via-surface-card to-violet-900/20 p-8 sm:p-12 animate-fade-in">
        <div className="absolute top-0 right-0 w-64 h-64 bg-vivid-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative max-w-2xl">
          <span className="badge bg-vivid-500/20 text-vivid-300 border border-vivid-500/30 mb-4">
            Digital Marketplace
          </span>
          <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight leading-tight mb-4">
            Discover art & comics from{' '}
            <span className="bg-gradient-to-r from-vivid-400 to-violet-400 bg-clip-text text-transparent">
              creators worldwide
            </span>
          </h1>
          <p className="text-gray-400 text-lg leading-relaxed">
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
          <p className="text-sm text-gray-400 mb-6">
            <span className="text-white font-semibold">{products.length}</span> result{products.length !== 1 ? 's' : ''}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product, index) => (
              <ProductCard
                key={product._id}
                title={product.title}
                description={product.description}
                type={product.type}
                price={product.price}
                creatorName={product.creatorName}
                previewImageUrl={product.previewImageUrl}
                index={index}
                onAddToCart={() => handleAddToCart(product)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
