import { resolveImageUrl } from '@/lib/imageUrl';

const TYPE_STYLES = {
  COMIC: { bg: 'bg-blue-500/15 text-blue-300 border-blue-500/30', emoji: '📚', gradient: 'from-blue-600/30 to-indigo-900/40' },
  ART: { bg: 'bg-pink-500/15 text-pink-300 border-pink-500/30', emoji: '🎨', gradient: 'from-pink-600/30 to-violet-900/40' },
  ASSET: { bg: 'bg-amber-500/15 text-amber-300 border-amber-500/30', emoji: '📦', gradient: 'from-amber-600/30 to-orange-900/40' },
} as const;

interface ProductCardProps {
  title: string;
  description: string;
  type: keyof typeof TYPE_STYLES;
  price: number;
  creatorName: string;
  previewImageUrl?: string;
  onAddToCart: () => void;
  index?: number;
}

export function ProductCard({
  title,
  description,
  type,
  price,
  creatorName,
  previewImageUrl,
  onAddToCart,
  index = 0,
}: ProductCardProps) {
  const style = TYPE_STYLES[type] ?? TYPE_STYLES.ASSET;
  const imageSrc = resolveImageUrl(previewImageUrl);

  return (
    <article
      className="group glass-panel overflow-hidden hover:border-vivid-500/30 hover:shadow-glow transition-all duration-300 animate-slide-up"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className={`relative h-52 bg-gradient-to-br ${style.gradient} overflow-hidden`}>
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
        <div className="absolute inset-0 bg-gradient-to-t from-surface-card via-transparent to-transparent" />
        <span className={`absolute top-3 left-3 badge border ${style.bg}`}>{type}</span>
        {imageSrc && (
          <span className="absolute top-3 right-3 badge bg-black/50 text-gray-200 border border-white/10">
            Protected
          </span>
        )}
      </div>
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-2">
          <h3 className="text-lg font-semibold text-white line-clamp-1 group-hover:text-vivid-300 transition-colors">
            {title}
          </h3>
          <span className="text-lg font-bold text-vivid-400 shrink-0">${price.toFixed(2)}</span>
        </div>
        <p className="text-sm text-gray-400 line-clamp-2 mb-4 leading-relaxed">{description}</p>
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-gray-500 truncate">by <span className="text-gray-300">{creatorName}</span></p>
          <button onClick={onAddToCart} className="btn-primary py-2 px-4 text-xs shrink-0">
            Add to Cart
          </button>
        </div>
      </div>
    </article>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="glass-panel overflow-hidden animate-pulse">
      <div className="h-52 bg-surface-elevated bg-gradient-to-r from-surface-elevated via-surface-border/30 to-surface-elevated bg-[length:200%_100%] animate-shimmer" />
      <div className="p-5 space-y-3">
        <div className="h-5 bg-surface-elevated rounded-lg w-3/4" />
        <div className="h-4 bg-surface-elevated rounded-lg w-full" />
        <div className="h-4 bg-surface-elevated rounded-lg w-2/3" />
        <div className="h-9 bg-surface-elevated rounded-xl w-full mt-4" />
      </div>
    </div>
  );
}
