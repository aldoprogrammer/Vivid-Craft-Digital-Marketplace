interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  readOnly?: boolean;
  size?: 'sm' | 'md';
}

export function StarRating({ value, onChange, readOnly = false, size = 'md' }: StarRatingProps) {
  const starSize = size === 'sm' ? 'text-base' : 'text-xl';

  return (
    <div className="flex items-center gap-1" role={readOnly ? 'img' : 'radiogroup'} aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= value;
        if (readOnly) {
          return (
            <span key={star} className={`${starSize} ${filled ? 'text-amber-400' : 'text-mist/40'}`} aria-hidden="true">
              {filled ? '★' : '☆'}
            </span>
          );
        }

        return (
          <button
            key={star}
            type="button"
            onClick={() => onChange?.(star)}
            className={`${starSize} transition-colors ${
              filled ? 'text-amber-400 hover:text-amber-300' : 'text-mist hover:text-amber-300'
            }`}
            aria-label={`${star} star${star > 1 ? 's' : ''}`}
          >
            {filled ? '★' : '☆'}
          </button>
        );
      })}
    </div>
  );
}
