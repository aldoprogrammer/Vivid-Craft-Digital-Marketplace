import { Link } from 'react-router-dom';
import { resolveImageUrl } from '@/lib/imageUrl';

const TYPE_STYLES = {
  COMIC: { bg: 'bg-brand-accent/15 text-brand-accent border-brand-accent/30', emoji: '📚', cover: 'bg-brand-primary' },
  ART: { bg: 'bg-brand-highlight/15 text-brand-highlight border-brand-highlight/30', emoji: '🎨', cover: 'bg-brand-secondary' },
  ASSET: { bg: 'bg-amber-500/15 text-amber-300 border-amber-500/30', emoji: '📦', cover: 'bg-surface-elevated' },
} as const;

interface ProductCardProps {
  productId?: string;
  creatorId?: string;
  title: string;
  description: string;
  type: keyof typeof TYPE_STYLES;
  price: number;
  creatorName: string;
  previewImageUrl?: string;
  isWatermarked?: boolean;
  onAddToCart: () => void;
  onFavorite?: () => void;
  isFavorite?: boolean;
  favoriteCount?: number;
  favoritePending?: boolean;
  alreadyOwned?: boolean;
  index?: number;
}

export function ProductCard({
  productId,
  creatorId,
  title,
  description,
  type,
  price,
  creatorName,
  previewImageUrl,
  isWatermarked = false,
  onAddToCart,
  onFavorite,
  isFavorite = false,
  favoriteCount = 0,
  favoritePending = false,
  alreadyOwned = false,
  index = 0,
}: ProductCardProps) {
  const style = TYPE_STYLES[type] ?? TYPE_STYLES.ASSET;
  const imageSrc = resolveImageUrl(previewImageUrl);

  return (
    <article
      className="group glass-panel overflow-hidden hover:border-brand-accent/30 hover:shadow-glow transition-all duration-300 animate-slide-up"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className={`on-solid relative h-52 ${style.cover} overflow-hidden`}>
        {imageSrc ? (
          <img
            src={imageSrc}
            alt={title}
            className="absolute inset-0 h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-6xl opacity-60 group-hover:scale-110 transition-transform duration-500">
              {style.emoji}
            </span>
          </div>
        )}
        <div className="absolute inset-0 bg-[rgba(23,19,31,0.6)]" />
        <span className={`absolute top-3 left-3 badge border ${style.bg}`}>{type}</span>
        {onFavorite && (
          <button
            type="button"
            onClick={onFavorite}
            disabled={favoritePending}
            aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            aria-pressed={isFavorite}
            className={`absolute top-3 right-3 flex h-10 min-w-10 items-center justify-center gap-1 rounded-full border px-3 text-sm font-semibold transition-colors ${
              isFavorite
                ? 'border-red-300/40 bg-red-500 text-white'
                : 'border-white/20 bg-black/50 text-white hover:bg-black/70'
            } disabled:opacity-50`}
          >
            <span aria-hidden="true">{isFavorite ? '♥' : '♡'}</span>
            <span className="text-xs">{favoriteCount}</span>
          </button>
        )}
        {isWatermarked && imageSrc && (
          <span className={`absolute badge bg-black/50 text-white border border-white/10 ${
            onFavorite ? 'top-16 right-3' : 'top-3 right-3'
          }`}>
            Protected
          </span>
        )}
      </div>
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-2">
          <h3 className="text-lg font-semibold text-content line-clamp-1 group-hover:text-brand-accent-deep transition-colors">
            {title}
          </h3>
          <span className="text-lg font-bold text-brand-accent-deep shrink-0">${price.toFixed(2)}</span>
        </div>
        <p className="text-sm text-mist line-clamp-2 mb-4 leading-relaxed">{description}</p>
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-mist truncate">
            by{' '}
            {creatorId ? (
              <Link to={`/users/${creatorId}`} className="text-content hover:text-brand-accent-deep transition-colors">
                {creatorName}
              </Link>
            ) : (
              <span className="text-content">{creatorName}</span>
            )}
          </p>
          <div className="flex items-center gap-2 shrink-0">
            {productId && (
              <Link
                to={`/products/${productId}/reviews`}
                className="btn-secondary py-2 px-3 text-xs"
              >
                Reviews
              </Link>
            )}
            <button
              onClick={onAddToCart}
              disabled={alreadyOwned}
              className="btn-primary py-2 px-4 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {alreadyOwned ? 'Owned' : 'Add to Cart'}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="glass-panel overflow-hidden animate-pulse">
      <div className="h-52 bg-surface-elevated" />
      <div className="p-5 space-y-3">
        <div className="h-5 bg-surface-elevated rounded-lg w-3/4" />
        <div className="h-4 bg-surface-elevated rounded-lg w-full" />
        <div className="h-4 bg-surface-elevated rounded-lg w-2/3" />
        <div className="h-9 bg-surface-elevated rounded-xl w-full mt-4" />
      </div>
    </div>
  );
}
