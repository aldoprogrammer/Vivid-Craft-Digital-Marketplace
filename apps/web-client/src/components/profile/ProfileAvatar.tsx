import { resolveImageUrl } from '@/lib/imageUrl';

interface ProfileAvatarProps {
  name: string;
  avatarUrl?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const SIZE_CLASS = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-12 w-12 text-base',
  lg: 'h-20 w-20 text-2xl',
  xl: 'h-28 w-28 text-3xl',
} as const;

export function ProfileAvatar({ name, avatarUrl, size = 'md', className = '' }: ProfileAvatarProps) {
  const src = resolveImageUrl(avatarUrl ?? undefined);
  const initial = name?.charAt(0)?.toUpperCase() || '?';

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={`rounded-2xl object-cover border border-surface-border ${SIZE_CLASS[size]} ${className}`}
      />
    );
  }

  return (
    <span
      className={`flex items-center justify-center rounded-2xl bg-brand-primary text-brand-accent font-bold border border-brand-accent/30 ${SIZE_CLASS[size]} ${className}`}
      aria-hidden="true"
    >
      {initial}
    </span>
  );
}
