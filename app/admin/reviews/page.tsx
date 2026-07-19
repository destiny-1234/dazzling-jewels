'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Star, Trash2, EyeOff, Eye } from 'lucide-react';
import { supabase } from '@/lib/supabase/admin-client';
import { AdminShell } from '@/components/admin/admin-shell';
import { formatDate } from '@/lib/format';

interface ReviewRow {
  id: string;
  reviewer_name: string;
  rating: number;
  comment: string | null;
  visible: boolean;
  created_at: string;
  products?: { name: string } | null;
}

export default function AdminReviewsPage() {
  const queryClient = useQueryClient();

  const { data: reviews } = useQuery({
    queryKey: ['admin-reviews'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_reviews')
        .select('*, products(name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as ReviewRow[];
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin-reviews'] });

  const toggleVisible = async (review: ReviewRow) => {
    const { error } = await supabase.from('product_reviews').update({ visible: !review.visible }).eq('id', review.id);
    if (error) {
      toast.error('Failed to update review');
    } else {
      invalidate();
    }
  };

  const deleteReview = async (id: string) => {
    if (!confirm('Delete this review? This cannot be undone.')) return;
    const { error } = await supabase.from('product_reviews').delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete review');
    } else {
      toast.success('Review deleted');
      invalidate();
    }
  };

  return (
    <AdminShell>
      <h1 className="font-serif text-3xl font-medium text-zinc-100">Reviews</h1>
      <p className="mt-1 text-sm text-zinc-500">Verified-purchase reviews left on products</p>

      <div className="mt-6 space-y-3">
        {reviews?.map((review: ReviewRow) => (
          <div key={review.id} className="flex flex-wrap items-start justify-between gap-4 rounded-lg border border-zinc-800 bg-zinc-900/50 p-5">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium text-zinc-100">{review.reviewer_name}</p>
                <span className="text-xs text-zinc-500">on {review.products?.name || 'Unknown product'}</span>
                {!review.visible && (
                  <span className="rounded-full bg-zinc-700 px-2 py-0.5 text-[10px] font-medium text-zinc-400">Hidden</span>
                )}
              </div>
              <div className="mt-1 flex gap-0.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star key={n} className={`h-3.5 w-3.5 ${n <= review.rating ? 'fill-amber-400 text-amber-400' : 'text-zinc-700'}`} />
                ))}
              </div>
              {review.comment && <p className="mt-2 text-sm text-zinc-300">{review.comment}</p>}
              <p className="mt-1 text-xs text-zinc-500">{formatDate(review.created_at)}</p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <button
                onClick={() => toggleVisible(review)}
                className="flex items-center gap-1.5 rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800"
              >
                {review.visible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                {review.visible ? 'Hide' : 'Show'}
              </button>
              <button onClick={() => deleteReview(review.id)} className="text-zinc-500 hover:text-red-400">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}

        {reviews?.length === 0 && (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-12 text-center">
            <Star className="mx-auto h-12 w-12 text-zinc-600" />
            <p className="mt-4 text-sm text-zinc-500">No reviews yet.</p>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
