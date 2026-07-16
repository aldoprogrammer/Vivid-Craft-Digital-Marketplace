import { Navigate } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { useAuthStore } from '@/stores/authStore';
import { useAuthHydrated } from '@/hooks/useAuthHydrated';
import { useAdminOrders, useAdminUsers } from '@/hooks/useApi';

export function AdminDashboardPage() {
  const hydrated = useAuthHydrated();
  const { user, isAuthenticated } = useAuthStore();
  const isAdmin = isAuthenticated && user?.role === 'ADMIN';
  const { data: users = [], isLoading: usersLoading } = useAdminUsers(isAdmin);
  const { data: orders = [], isLoading: ordersLoading } = useAdminOrders(isAdmin);

  if (!hydrated) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-brand-accent border-t-transparent" />
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="max-w-6xl mx-auto animate-fade-in space-y-8">
      <PageHeader
        title="Admin Dashboard"
        subtitle="Platform users and recent orders."
      />

      <section className="glass-panel p-5 sm:p-6 overflow-x-auto">
        <h2 className="text-lg font-semibold text-content mb-4">Users ({users.length})</h2>
        {usersLoading ? (
          <p className="text-sm text-mist">Loading users…</p>
        ) : (
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-surface-border text-mist">
                <th className="py-2 pr-3 font-medium">Name</th>
                <th className="py-2 pr-3 font-medium">Email</th>
                <th className="py-2 pr-3 font-medium">Role</th>
                <th className="py-2 font-medium">Active</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-surface-border/60">
                  <td className="py-2.5 pr-3 text-content">{u.name}</td>
                  <td className="py-2.5 pr-3 text-mist font-mono text-xs">{u.email}</td>
                  <td className="py-2.5 pr-3">
                    <span className="badge border border-brand-accent/30 text-brand-accent">{u.role}</span>
                  </td>
                  <td className="py-2.5 text-content">{u.isActive ? 'Yes' : 'No'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="glass-panel p-5 sm:p-6 overflow-x-auto">
        <h2 className="text-lg font-semibold text-content mb-4">Orders ({orders.length})</h2>
        {ordersLoading ? (
          <p className="text-sm text-mist">Loading orders…</p>
        ) : (
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-surface-border text-mist">
                <th className="py-2 pr-3 font-medium">Invoice</th>
                <th className="py-2 pr-3 font-medium">Buyer</th>
                <th className="py-2 pr-3 font-medium">Total</th>
                <th className="py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-b border-surface-border/60">
                  <td className="py-2.5 pr-3 font-mono text-xs text-content">{o.invoiceNo}</td>
                  <td className="py-2.5 pr-3 text-mist">{o.userEmail}</td>
                  <td className="py-2.5 pr-3 text-content">${Number(o.totalAmount).toFixed(2)}</td>
                  <td className="py-2.5 text-brand-accent-deep font-medium">{o.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
