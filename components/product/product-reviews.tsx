'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Star } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { formatDate } from '@/lib/format';
import type { ProductReview } from '@/lib/types';

function StarRow({ rating, size = 'h-4 w-4' }: { rating: number; size?: string }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={`${size} ${n <= rating ? 'fill-accent text-accent' : 'text-border'}`} />
      ))}
    </div>
  );
}

export function ProductReviews({ productId }: { productId: string }) {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { data: reviews } = useQuery({
    queryKey: ['product-reviews', productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_reviews')
        .select('*')
        .eq('product_id', productId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as ProductReview[];
    },
  });

  // Find a paid order of this user's that actually contains this product —
  // needed both to know they're eligible to review, and to supply the
  // order_id the insert policy checks against.
  const { data: eligibleOrderId } = useQuery({
    queryKey: ['review-eligibility', productId, user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from('order_items')
        .select('order_id, orders!inner(user_id, payment_status)')
        .eq('product_id', productId)
        .eq('orders.user_id', user.id)
        .eq('orders.payment_status', 'paid')
        .limit(1)
        .maybeSingle();
      return data?.order_id || null;
    },
    enabled: !!user,
  });

  const myReview = reviews?.find((r: ProductReview) => r.user_id === user?.id);
  const canReview = !!user && !!eligibleOrderId && !myReview;

  const avgRating = reviews?.length
    ? reviews.reduce((sum: number, r: ProductReview) => sum + r.rating, 0) / reviews.length
    : 0;

  const handleSubmit = async () => {
    if (!user || !eligibleOrderId) return;
    if (rating === 0) {
      toast.error('Please select a star rating');
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from('product_reviews').insert({
      product_id: productId,
      order_id: eligibleOrderId,
      user_id: user.id,
      reviewer_name: profile?.full_name || 'Anonymous',
      rating,
      comment: comment.trim() || null,
    });
    setSubmitting(false);
    if (error) {
      toast.error('Failed to submit your review');
      return;
    }
    toast.success('Thank you for your review!');
    setRating(0);
    setComment('');
    queryClient.invalidateQueries({ queryKey: ['product-reviews', productId] });
    queryClient.invalidateQueries({ queryKey: ['review-eligibility', productId, user.id] });
  };

  return (
    <section className="mt-16 border-t border-border pt-12">
      <div className="flex items-center gap-4">
        <h2 className="font-serif text-2xl font-medium">Reviews</h2>
        {reviews && reviews.length > 0 && (
          <div className="flex items-center gap-2">
            <StarRow rating={Math.round(avgRating)} />
            <span className="text-sm text-muted-foreground">
              {avgRating.toFixed(1)} ({reviews.length} review{reviews.length === 1 ? '' : 's'})
            </span>
          </div>
        )}
      </div>

      {canReview && (
        <div className="card-luxe mt-6 p-6">
          <h3 className="font-serif text-lg font-medium">Write a Review</h3>
          <p className="mt-1 text-xs text-muted-foreground">Verified purchase — you bought this item.</p>
          <div className="mt-4 flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onMouseEnter={() => setHoverRating(n)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => setRating(n)}
                aria-label={`Rate ${n} stars`}
              >
                <Star
                  className={`h-7 w-7 ${
                    n <= (hoverRating || rating) ? 'fill-accent text-accent' : 'text-border'
                  }`}
                />
              </button>
            ))}
          </div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Tell others what you thought (optional)"
            className="input-luxe mt-4 min-h-[90px] w-full"
          />
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="btn-primary-luxe mt-4 disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : 'Submit Review'}
          </button>
        </div>
      )}

      <div className="mt-8 space-y-6">
        {reviews?.map((review: ProductReview) => (
          <div key={review.id} className="border-b border-border pb-6 last:border-0">
            <div className="flex items-center justify-between">
              <p className="font-medium">{review.reviewer_name}</p>
              <span className="text-xs text-muted-foreground">{formatDate(review.created_at)}</span>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <StarRow rating={review.rating} />
              <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-accent">
                Verified Purchase
              </span>
            </div>
            {review.comment && <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{review.comment}</p>}
          </div>
        ))}

        {reviews?.length === 0 && (
          <p className="text-sm text-muted-foreground">No reviews yet — be the first to share your thoughts.</p>
        )}
      </div>
    </section>
  );
}