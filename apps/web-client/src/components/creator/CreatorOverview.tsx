import { CreatorAnalytics, Product } from '@/hooks/useApi';
import { StatCard } from './StatCard';
import { BarChart } from './BarChart';

interface CreatorOverviewProps {
  products: Product[];
  analytics?: CreatorAnalytics;
  isLoading: boolean;
}

const TYPE_COLORS: Record<string, string> = {
  COMIC: '#65DCD5',
  ART: '#D9FFF4',
  ASSET: '#F5B942',
};

export function CreatorOverview({ products, analytics, isLoading }: CreatorOverviewProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-brand-accent border-t-transparent" />
      </div>
    );
  }

  const published = products.filter((p) => p.isPublished).length;
  const avgPrice =
    products.length > 0
      ? products.reduce((sum, p) => sum + p.price, 0) / products.length
      : 0;

  const listingsByType = [
    { label: 'Comics', value: products.filter((p) => p.type === 'COMIC').length, color: TYPE_COLORS.COMIC },
    { label: 'Digital Art', value: products.filter((p) => p.type === 'ART').length, color: TYPE_COLORS.ART },
    { label: 'Assets', value: products.filter((p) => p.type === 'ASSET').length, color: TYPE_COLORS.ASSET },
  ];

  const salesByType = [
    { label: 'Comics', value: analytics?.salesByType.COMIC ?? 0, color: TYPE_COLORS.COMIC },
    { label: 'Digital Art', value: analytics?.salesByType.ART ?? 0, color: TYPE_COLORS.ART },
    { label: 'Assets', value: analytics?.salesByType.ASSET ?? 0, color: TYPE_COLORS.ASSET },
  ];

  const revenueByMonth =
    analytics?.salesByMonth.map((m) => ({
      label: m.month,
      value: m.revenue,
      color: '#43637E',
    })) ?? [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total revenue"
          value={`$${(analytics?.revenue ?? 0).toFixed(2)}`}
          hint="From paid orders"
          accent="teal"
        />
        <StatCard
          label="Units sold"
          value={String(analytics?.totalSales ?? 0)}
          hint="Paid purchases"
          accent="violet"
        />
        <StatCard
          label="Active listings"
          value={`${published}/${products.length}`}
          hint="Published / total"
          accent="amber"
        />
        <StatCard
          label="Avg list price"
          value={`$${avgPrice.toFixed(2)}`}
          hint="Across your catalog"
          accent="slate"
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <BarChart title="Listings by type" items={listingsByType} />
        <BarChart title="Sales by type" items={salesByType} />
      </div>

      <BarChart title="Revenue by month" items={revenueByMonth} valuePrefix="$" />

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="glass-panel p-5 sm:p-6">
          <h3 className="text-sm font-semibold text-content mb-4">Top products</h3>
          {!analytics?.topProducts.length ? (
            <p className="text-sm text-mist py-4 text-center">No sales yet</p>
          ) : (
            <ul className="space-y-3">
              {analytics.topProducts.map((p, i) => (
                <li key={p.productId} className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-mist w-5">{i + 1}.</span>
                  <span className="text-content flex-1 truncate">{p.productName}</span>
                  <span className="text-brand-accent-deep font-medium shrink-0">
                    ${p.revenue.toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="glass-panel p-5 sm:p-6">
          <h3 className="text-sm font-semibold text-content mb-4">Recent sales</h3>
          {!analytics?.recentSales.length ? (
            <p className="text-sm text-mist py-4 text-center">No sales yet</p>
          ) : (
            <ul className="space-y-3">
              {analytics.recentSales.map((sale, i) => (
                <li key={`${sale.invoiceNo}-${i}`} className="text-sm border-b border-surface-border pb-3 last:border-0 last:pb-0">
                  <div className="flex justify-between gap-2">
                    <span className="text-content font-medium truncate">{sale.productName}</span>
                    <span className="text-brand-accent-deep shrink-0">
                      ${(sale.price * sale.quantity).toFixed(2)}
                    </span>
                  </div>
                  <p className="text-xs text-mist mt-0.5">
                    {sale.invoiceNo} · {new Date(sale.soldAt).toLocaleDateString()}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
