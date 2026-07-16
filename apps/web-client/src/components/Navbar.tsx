import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useCartStore, selectCartItemCount } from '@/stores/cartStore';
import { useThemeStore } from '@/stores/themeStore';
import { notify } from '@/lib/toast';
import { useSseNotifications } from '@/hooks/useSseNotifications';
import { NotificationDropdown } from '@/components/NotificationDropdown';

const NAV_LINKS = [
  { to: '/', label: 'Marketplace' },
  { to: '/dashboard', label: 'Dashboard', creatorOnly: true },
  { to: '/admin', label: 'Admin', adminOnly: true },
  { to: '/library', label: 'Library', authOnly: true },
  { to: '/orders', label: 'Orders', authOnly: true },
  { to: '/cart', label: 'Cart' },
];

function ThemeToggle() {
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Light mode' : 'Dark mode'}
      className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/15 text-white/80 hover:text-white hover:bg-white/10 transition-colors"
    >
      {isDark ? '☀️' : '🌙'}
    </button>
  );
}

export function Navbar() {
  const location = useLocation();
  const { isAuthenticated, user, logout } = useAuthStore();
  const itemCount = useCartStore(selectCartItemCount);
  useSseNotifications(isAuthenticated ? user?.id : undefined);

  const handleLogout = () => {
    logout();
    notify.success('Signed out successfully');
  };

  return (
    <header className="on-solid sticky top-0 z-50 border-b border-white/10 bg-surface-nav/95 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex h-16 items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2.5 group">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-primary text-sm font-bold text-brand-accent shadow-glow">
              V
            </span>
            <span className="text-xl font-display font-bold text-white group-hover:text-brand-highlight transition-colors">
              Vivid<span className="text-brand-accent">Craft</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((link) => {
              if (link.creatorOnly && (!isAuthenticated || user?.role !== 'CREATOR')) return null;
              if (link.adminOnly && (!isAuthenticated || user?.role !== 'ADMIN')) return null;
              if (link.authOnly && !isAuthenticated) return null;
              const active = location.pathname === link.to;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    active ? 'text-white bg-white/10' : 'text-white/70 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {link.label}
                  {link.to === '/cart' && itemCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-accent px-1 text-[10px] font-bold text-ink">
                      {itemCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
            {isAuthenticated ? (
              <>
                <NotificationDropdown />
                <Link
                  to={user?.id ? `/users/${user.id}` : '/profile/edit'}
                  className="hidden sm:flex items-center gap-2.5 rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 hover:bg-white/10 transition-colors"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-primary/60 text-xs font-bold text-brand-accent">
                    {user?.name?.charAt(0).toUpperCase()}
                  </span>
                  <div className="text-left">
                    <p className="text-sm font-medium text-white leading-tight">{user?.name}</p>
                    <p className="text-[10px] uppercase tracking-wider text-white/60">{user?.role}</p>
                  </div>
                </Link>
                <button
                  onClick={handleLogout}
                  className="hidden sm:inline-flex items-center rounded-lg px-3 py-2 text-sm font-medium text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="hidden sm:inline-flex items-center rounded-lg px-3 py-2 text-sm font-medium text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                >
                  Sign in
                </Link>
                <Link to="/register" className="btn-primary py-2 px-4 text-sm">
                  Get Started
                </Link>
              </>
            )}

            <Link
              to="/cart"
              className="md:hidden relative inline-flex items-center rounded-xl border border-white/15 bg-white/5 py-2 px-3 text-sm font-medium text-white"
            >
              Cart
              {itemCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-accent px-1 text-[10px] font-bold text-ink">
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
