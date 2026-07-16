import { useState } from 'react';
import { StarRating } from './StarRating';
import type { ReviewNode } from '@/hooks/useApi';

interface ReviewThreadProps {
  review: ReviewNode;
  depth?: number;
  currentUserId?: string;
  canReply: boolean;
  onReply: (parentId: string, comment: string) => Promise<void>;
  replyPending?: boolean;
}

function ReviewItem({
  review,
  depth = 0,
  currentUserId,
  canReply,
  onReply,
  replyPending,
}: ReviewThreadProps) {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyText, setReplyText] = useState('');

  const handleReply = async () => {
    if (!replyText.trim()) return;
    await onReply(review.id, replyText.trim());
    setReplyText('');
    setShowReplyForm(false);
  };

  return (
    <div className={depth > 0 ? 'ml-4 sm:ml-8 border-l border-surface-border pl-4' : ''}>
      <div className="glass-panel p-4 sm:p-5 mb-3">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
          <div>
            <p className="font-medium text-content">{review.authorName}</p>
            <p className="text-xs text-mist">
              {review.authorRole === 'CREATOR' ? 'Seller' : 'Buyer'} ·{' '}
              {new Date(review.createdAt).toLocaleString()}
            </p>
          </div>
          {review.rating != null && <StarRating value={review.rating} readOnly size="sm" />}
        </div>
        <p className="text-sm text-content leading-relaxed whitespace-pre-wrap">{review.comment}</p>

        {canReply && review.authorId !== currentUserId && (
          <button
            type="button"
            onClick={() => setShowReplyForm((v) => !v)}
            className="mt-3 text-xs font-medium text-brand-accent-deep hover:text-brand-accent transition-colors"
          >
            {showReplyForm ? 'Cancel' : 'Reply'}
          </button>
        )}

        {showReplyForm && (
          <div className="mt-3 space-y-2">
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              rows={3}
              placeholder="Write a reply..."
              className="input-field resize-none text-sm"
            />
            <button
              type="button"
              onClick={handleReply}
              disabled={replyPending || !replyText.trim()}
              className="btn-primary py-2 px-4 text-xs"
            >
              Post reply
            </button>
          </div>
        )}
      </div>

      {review.replies.map((reply) => (
        <ReviewItem
          key={reply.id}
          review={reply}
          depth={depth + 1}
          currentUserId={currentUserId}
          canReply={canReply}
          onReply={onReply}
          replyPending={replyPending}
        />
      ))}
    </div>
  );
}

interface ReviewListProps {
  reviews: ReviewNode[];
  currentUserId?: string;
  canReply: boolean;
  onReply: (parentId: string, comment: string) => Promise<void>;
  replyPending?: boolean;
}

export function ReviewList({
  reviews,
  currentUserId,
  canReply,
  onReply,
  replyPending,
}: ReviewListProps) {
  if (!reviews.length) {
    return (
      <div className="glass-panel p-8 text-center">
        <p className="text-content font-medium">No reviews yet</p>
        <p className="text-sm text-mist mt-1">Be the first to share your experience.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {reviews.map((review) => (
        <ReviewItem
          key={review.id}
          review={review}
          currentUserId={currentUserId}
          canReply={canReply}
          onReply={onReply}
          replyPending={replyPending}
        />
      ))}
    </div>
  );
}
