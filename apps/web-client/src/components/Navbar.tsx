import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useCartStore, selectCartItems, selectCartItemCount, selectCartTotal } from '@/stores/cartStore';
import { notify } from '@/lib/toast';

const NAV_LINKS = [
  { to: '/', label: 'Marketplace' },
  { to: '/dashboard', label: 'Dashboard', creatorOnly: true },
  { to: '/orders', label: 'Orders', authOnly: true },
  { to: '/cart', label: 'Cart' },
];

export function Navbar() {
  const location = useLocation();
  const { isAuthenticated, user, logout } = useAuthStore();
  const itemCount = useCartStore(selectCartItemCount);

  const handleLogout = () => {
    logout();
    notify.success('Signed out successfully');
  };

  return (
    <header className="sticky top-0 z-50 border-b border-surface-border/60 bg-surface/70 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex h-16 items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2.5 group">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-vivid-500 to-violet-600 text-sm font-bold text-white shadow-glow">
              V
            </span>
            <span className="text-xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent group-hover:from-vivid-300 group-hover:to-white transition-all">
              VividCraft
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((link) => {
              if (link.creatorOnly && (!isAuthenticated || user?.role !== 'CREATOR')) return null;
              if (link.authOnly && !isAuthenticated) return null;
              const active = location.pathname === link.to;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    active ? 'text-white bg-white/5' : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {link.label}
                  {link.to === '/cart' && itemCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-vivid-600 px-1 text-[10px] font-bold text-white">
                      {itemCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            {isAuthenticated ? (
              <>
                <div className="hidden sm:flex items-center gap-2.5 rounded-xl border border-surface-border bg-surface-elevated/50 px-3 py-1.5">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-vivid-600/20 text-xs font-bold text-vivid-300">
                    {user?.name?.charAt(0).toUpperCase()}
                  </span>
                  <div className="text-left">
                    <p className="text-sm font-medium text-white leading-tight">{user?.name}</p>
                    <p className="text-[10px] uppercase tracking-wider text-gray-500">{user?.role}</p>
                  </div>
                </div>
                <button onClick={handleLogout} className="btn-ghost hidden sm:inline-flex">
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn-ghost hidden sm:inline-flex">
                  Sign in
                </Link>
                <Link to="/register" className="btn-primary py-2 px-4 text-sm">
                  Get Started
                </Link>
              </>
            )}

            <Link to="/cart" className="btn-secondary py-2 px-3 md:hidden relative">
              Cart
              {itemCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-vivid-600 px-1 text-[10px] font-bold">
                  {itemCount}
                </span>
              )}
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
