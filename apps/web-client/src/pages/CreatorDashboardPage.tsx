import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { useAuthStore } from '@/stores/authStore';
import { useCreatorAnalytics, useMyProducts } from '@/hooks/useApi';
import { CreatorOverview } from '@/components/creator/CreatorOverview';
import { CreatorListings } from '@/components/creator/CreatorListings';
import { CreatorCreateForm } from '@/components/creator/CreatorCreateForm';

type Tab = 'overview' | 'listings' | 'create';

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'listings', label: 'My Listings' },
  { id: 'create', label: 'Create New' },
];

export function CreatorDashboardPage() {
  const { user, isAuthenticated } = useAuthStore();
  const [tab, setTab] = useState<Tab>('overview');
  const isCreator = isAuthenticated && user?.role === 'CREATOR';

  const { data: products = [], isLoading: productsLoading } = useMyProducts(isCreator);
  const { data: analytics, isLoading: analyticsLoading } = useCreatorAnalytics(isCreator);

  if (!isAuthenticated || user?.role !== 'CREATOR') {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="max-w-6xl mx-auto animate-fade-in">
      <PageHeader
        title="Creator Dashboard"
        subtitle="Track performance, manage listings, and publish new work."
        action={
          <div className="flex items-center gap-3 rounded-xl border border-surface-border bg-surface-elevated/50 px-3 py-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-primary/40 text-sm font-bold text-brand-accent">
              {user.name.charAt(0).toUpperCase()}
            </span>
            <div>
              <p className="text-sm font-medium text-content">{user.name}</p>
              <p className="text-xs text-mist">Creator</p>
            </div>
          </div>
        }
      />

      <div className="flex flex-wrap gap-2 mb-8 p-1 rounded-xl bg-surface-elevated border border-surface-border w-fit">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t.id
                ? 'bg-brand-primary text-white'
                : 'text-mist hover:text-content hover:bg-surface-card'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <CreatorOverview
          products={products}
          analytics={analytics}
          isLoading={productsLoading || analyticsLoading}
        />
      )}

      {tab === 'listings' && (
        <CreatorListings products={products} isLoading={productsLoading} />
      )}

      {tab === 'create' && (
        <CreatorCreateForm onPublished={() => setTab('listings')} />
      )}
    </div>
  );
}
