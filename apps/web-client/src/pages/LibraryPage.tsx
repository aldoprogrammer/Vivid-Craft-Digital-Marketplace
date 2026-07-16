import { Navigate, Link } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { useAuthStore } from '@/stores/authStore';
import { useAuthHydrated } from '@/hooks/useAuthHydrated';
import { usePurchases } from '@/hooks/useApi';
import { apiClient } from '@/lib/apiClient';
import { notify } from '@/lib/toast';

const TYPE_LABEL: Record<string, string> = {
  COMIC: 'Comic',
  ART: 'Digital Art',
  ASSET: 'Asset Pack',
};

export function LibraryPage() {
  const hydrated = useAuthHydrated();
  const { user, isAuthenticated } = useAuthStore();
  const { data: purchases, isLoading, error, refetch } = usePurchases(
    hydrated ? user?.id : undefined,
  );

  const handleDownload = async (token: string, productName: string) => {
    const toastId = notify.loading(`Preparing ${productName}…`);
    try {
      const { data } = await apiClient.get(
        `/api/transactions/purchases/${token}/download`,
        { responseType: 'blob' },
      );
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${productName.replace(/[^a-z0-9-_]+/gi, '_').toLowerCase()}_license.txt`;
      a.click();
      URL.revokeObjectURL(url);
      notify.dismiss(toastId);
      notify.success('Download started');
      refetch();
    } catch {
      notify.dismiss(toastId);
      notify.error('Download failed');
    }
  };

  if (!hydrated) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-brand-accent border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-brand-accent border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        icon="⚠️"
        title="Couldn't load library"
        description="Transaction service may still be starting. Try again shortly."
      />
    );
  }

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <PageHeader
        title="My Library"
        subtitle="Digital goods you own. Download your license anytime."
      />

      {!purchases?.length ? (
        <EmptyState
          icon="📚"
          title="No purchases yet"
          description="When a payment completes, your comics, art, and assets appear here."
          actionLabel="Browse Marketplace"
          actionTo="/"
        />
      ) : (
        <div className="space-y-4">
          {purchases.map((item) => (
            <div key={item.id} className="glass-panel p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                <div>
                  <h3 className="text-lg font-semibold text-content">{item.productName}</h3>
                  <p className="text-sm text-mist mt-1">
                    {TYPE_LABEL[item.productType] ?? item.productType}
                  </p>
                </div>
                <span className="badge border border-brand-accent/30 text-brand-accent bg-brand-accent/10">
                  Owned
                </span>
              </div>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm mb-4 pb-4 border-b border-surface-border">
                <div>
                  <dt className="text-mist">Invoice</dt>
                  <dd className="font-mono text-content">{item.invoiceNo}</dd>
                </div>
                <div>
                  <dt className="text-mist">Delivered</dt>
                  <dd className="text-content">
                    {new Date(item.deliveredAt).toLocaleString()}
                  </dd>
                </div>
                <div>
                  <dt className="text-mist">Downloads</dt>
                  <dd className="text-content">{item.downloadCount}</dd>
                </div>
                <div>
                  <dt className="text-mist">Product ID</dt>
                  <dd className="font-mono text-xs text-mist break-all">{item.productId}</dd>
                </div>
              </dl>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleDownload(item.downloadToken, item.productName)}
                  className="btn-primary py-2 px-4 text-sm"
                >
                {item.hasAsset ? 'Download asset' : 'Download license'}
              </button>
                <Link
                  to={`/products/${item.productId}/reviews`}
                  className="btn-secondary py-2 px-4 text-sm"
                >
                  Reviews
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
