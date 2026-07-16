import { useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { StarRating } from '@/components/reviews/StarRating';
import { ReviewList } from '@/components/reviews/ReviewList';
import { useAuthStore } from '@/stores/authStore';
import { useAuthHydrated } from '@/hooks/useAuthHydrated';
import {
  useCreateReview,
  useProductReviews,
  useReplyReview,
  useReviewEligibility,
} from '@/hooks/useApi';
import { notify } from '@/lib/toast';

export function ProductReviewsPage() {
  const { productId } = useParams<{ productId: string }>();
  const hydrated = useAuthHydrated();
  const { user, isAuthenticated } = useAuthStore();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  const { data: reviewData, isLoading } = useProductReviews(productId);
  const { data: eligibility } = useReviewEligibility(
    productId,
    isAuthenticated && hydrated,
  );
  const createReview = useCreateReview();
  const replyReview = useReplyReview();

  if (!productId) {
    return <Navigate to="/" replace />;
  }

  const handleCreateReview = async () => {
    if (!comment.trim()) {
      notify.error('Please write a comment');
      return;
    }
    try {
      await createReview.mutateAsync({ productId, rating, comment: comment.trim() });
      notify.success('Review posted');
      setComment('');
      setRating(5);
    } catch {
      notify.error('Could not post review. You must own this product.');
    }
  };

  const handleReply = async (parentId: string, replyComment: string) => {
    try {
      await replyReview.mutateAsync({ parentId, comment: replyComment });
      notify.success('Reply posted');
    } catch {
      notify.error('Could not post reply');
    }
  };

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <PageHeader
        title={eligibility?.productName ?? reviewData?.productName ?? 'Product Reviews'}
        subtitle="Ratings and comments from verified owners."
        action={
          <Link to="/library" className="btn-secondary py-2 px-4 text-sm">
            Back to Library
          </Link>
        }
      />

      <div className="glass-panel p-5 sm:p-6 mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-mist mb-1">Average rating</p>
          <div className="flex items-center gap-3">
            <StarRating
              value={Math.round(reviewData?.averageRating ?? 0)}
              readOnly
            />
            <span className="text-2xl font-display font-bold text-content">
              {(reviewData?.averageRating ?? 0).toFixed(1)}
            </span>
          </div>
        </div>
        <p className="text-sm text-mist">
          {reviewData?.reviewCount ?? 0} review{(reviewData?.reviewCount ?? 0) === 1 ? '' : 's'}
        </p>
      </div>

      {isAuthenticated && eligibility?.canReview && (
        <div className="glass-panel p-5 sm:p-6 mb-6">
          <h2 className="text-lg font-semibold text-content mb-4">Write your review</h2>
          <p className="text-sm text-mist mb-4">Only verified owners can leave a star rating.</p>
          <div className="mb-4">
            <p className="text-sm font-medium text-content mb-2">Your rating</p>
            <StarRating value={rating} onChange={setRating} />
          </div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={4}
            placeholder="Share what you liked about this digital product..."
            className="input-field resize-none mb-4"
          />
          <button
            type="button"
            onClick={handleCreateReview}
            disabled={createReview.isPending}
            className="btn-primary py-2 px-4 text-sm"
          >
            Submit review
          </button>
        </div>
      )}

      {!isAuthenticated && (
        <div className="glass-panel p-5 mb-6 text-sm text-mist">
          <Link to="/login" className="text-brand-accent-deep hover:text-brand-accent font-medium">
            Sign in
          </Link>{' '}
          to write a review or reply.
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-brand-accent border-t-transparent" />
        </div>
      ) : (
        <ReviewList
          reviews={reviewData?.reviews ?? []}
          currentUserId={user?.id}
          canReply={!!eligibility?.canReply}
          onReply={handleReply}
          replyPending={replyReview.isPending}
        />
      )}
    </div>
  );
}
