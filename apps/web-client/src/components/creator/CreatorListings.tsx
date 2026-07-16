import { Product, useDeleteProduct, useUpdateProduct } from '@/hooks/useApi';
import { resolveImageUrl } from '@/lib/imageUrl';
import { notify } from '@/lib/toast';

const TYPE_LABEL: Record<string, string> = {
  COMIC: 'Comic',
  ART: 'Digital Art',
  ASSET: 'Asset Pack',
};

interface CreatorListingsProps {
  products: Product[];
  isLoading: boolean;
}

export function CreatorListings({ products, isLoading }: CreatorListingsProps) {
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();

  const handleTogglePublish = async (product: Product) => {
    try {
      await updateProduct.mutateAsync({
        id: product._id,
        isPublished: !product.isPublished,
      });
      notify.success(product.isPublished ? 'Listing unpublished' : 'Listing published');
    } catch {
      notify.error('Failed to update listing');
    }
  };

  const handleDelete = async (product: Product) => {
    if (!window.confirm(`Delete "${product.title}"? This cannot be undone.`)) return;
    try {
      await deleteProduct.mutateAsync(product._id);
      notify.success('Listing deleted');
    } catch {
      notify.error('Failed to delete listing');
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-brand-accent border-t-transparent" />
      </div>
    );
  }

  if (!products.length) {
    return (
      <div className="glass-panel p-10 text-center">
        <p className="text-4xl mb-3">📭</p>
        <p className="text-content font-medium">No listings yet</p>
        <p className="text-sm text-mist mt-1">Create your first comic, art, or asset pack.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {products.map((product) => {
        const imageSrc = resolveImageUrl(product.previewImageUrl);
        return (
          <div
            key={product._id}
            className="glass-panel p-4 sm:p-5 flex flex-col sm:flex-row gap-4 sm:items-center"
          >
            <div className="h-16 w-16 shrink-0 rounded-xl overflow-hidden bg-surface-elevated border border-surface-border">
              {imageSrc ? (
                <img src={imageSrc} alt={product.title} className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-2xl opacity-60">
                  {product.type === 'COMIC' ? '📚' : product.type === 'ART' ? '🎨' : '📦'}
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h3 className="font-semibold text-content truncate">{product.title}</h3>
                <span
                  className={`badge border text-[10px] ${
                    product.isPublished
                      ? 'border-green-500/30 text-green-500 bg-green-500/10'
                      : 'border-amber-500/30 text-amber-500 bg-amber-500/10'
                  }`}
                >
                  {product.isPublished ? 'Live' : 'Draft'}
                </span>
              </div>
              <p className="text-sm text-mist line-clamp-1">{product.description}</p>
              <div className="flex flex-wrap gap-3 mt-2 text-xs text-mist">
                <span>{TYPE_LABEL[product.type] ?? product.type}</span>
                <span>${product.price.toFixed(2)}</span>
                <span>{product.favoriteCount ?? 0} favorites</span>
                <span>{product.downloadCount ?? 0} downloads</span>
                {product.createdAt && (
                  <span>{new Date(product.createdAt).toLocaleDateString()}</span>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 sm:shrink-0">
              <button
                type="button"
                onClick={() => handleTogglePublish(product)}
                className="btn-secondary py-2 px-3 text-xs"
                disabled={updateProduct.isPending}
              >
                {product.isPublished ? 'Unpublish' : 'Publish'}
              </button>
              <button
                type="button"
                onClick={() => handleDelete(product)}
                className="btn-ghost py-2 px-3 text-xs text-red-400 hover:text-red-300"
                disabled={deleteProduct.isPending}
              >
                Delete
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
