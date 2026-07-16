import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  type AppNotification,
} from '@/hooks/useApi';

function formatRelativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function notificationIcon(type: string) {
  switch (type) {
    case 'order.created':
    case 'order.status_changed':
      return '🧾';
    case 'product.favorited':
      return '♥';
    case 'review.created':
    case 'review.replied':
      return '★';
    default:
      return '•';
  }
}

function NotificationItem({
  item,
  onOpen,
}: {
  item: AppNotification;
  onOpen: (item: AppNotification) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(item)}
      className={`w-full text-left px-4 py-3 transition-colors hover:bg-white/5 ${
        item.read ? 'opacity-70' : 'bg-brand-accent/5'
      }`}
    >
      <div className="flex gap-3">
        <span
          className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-primary/40 text-sm"
          aria-hidden
        >
          {notificationIcon(item.type)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className={`text-sm leading-snug ${item.read ? 'text-white/80' : 'text-white font-medium'}`}>
              {item.title}
            </p>
            {!item.read && (
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-accent" aria-label="Unread" />
            )}
          </div>
          <p className="mt-1 text-xs leading-relaxed text-white/60 line-clamp-2">{item.body}</p>
          <p className="mt-1.5 text-[10px] uppercase tracking-wide text-white/40">
            {formatRelativeTime(item.createdAt)}
          </p>
        </div>
      </div>
    </button>
  );
}

export function NotificationDropdown() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { data, isLoading } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const unreadCount = data?.unreadCount ?? 0;
  const items = data?.items ?? [];

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!panelRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  const handleOpen = (item: AppNotification) => {
    if (!item.read) {
      markRead.mutate(item.id);
    }
    setOpen(false);
    if (item.linkPath) {
      navigate(item.linkPath);
    }
  };

  const handleMarkAll = () => {
    if (unreadCount === 0) return;
    markAllRead.mutate();
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label="Notifications"
        aria-expanded={open}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-white/15 text-white/80 hover:bg-white/10 hover:text-white transition-colors"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-2" aria-hidden>
          <path d="M15 17H9c-2.2 0-4-1.8-4-4V9a7 7 0 1 1 14 0v4c0 2.2-1.8 4-4 4Z" />
          <path d="M12 17v3" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-accent px-1 text-[10px] font-bold text-ink">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-white/10 bg-surface-nav shadow-xl">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-white">Notifications</p>
              {unreadCount > 0 && (
                <p className="text-xs text-white/50">{unreadCount} unread</p>
              )}
            </div>
            <button
              type="button"
              onClick={handleMarkAll}
              disabled={unreadCount === 0 || markAllRead.isPending}
              className="text-xs font-medium text-brand-accent hover:text-brand-highlight disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Mark all read
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto divide-y divide-white/5">
            {isLoading ? (
              <p className="px-4 py-8 text-center text-sm text-white/50">Loading…</p>
            ) : items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-white/50">No notifications yet</p>
            ) : (
              items.map((item) => (
                <NotificationItem key={item.id} item={item} onOpen={handleOpen} />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
