'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Bell, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth-context';

export function NotifyBackInStock({ productId }: { productId: string }) {
  const { user, profile } = useAuth();
  const [email, setEmail] = useState(profile?.email || '');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error('Please enter your email');
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from('back_in_stock_requests').insert({
      product_id: productId,
      email: email.trim(),
      user_id: user?.id || null,
    });
    setSubmitting(false);

    if (error) {
      if (error.code === '23505') {
        // Unique violation — they already asked for this exact product/email.
        setDone(true);
      } else {
        toast.error('Something went wrong. Please try again.');
      }
      return;
    }
    setDone(true);
    toast.success("We'll email you when it's back.");
  };

  if (done) {
    return (
      <p className="mt-3 flex items-center gap-2 text-sm text-green-600">
        <Check className="h-4 w-4" />
        We&apos;ll email you as soon as this is back in stock.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 flex gap-2">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Your email"
        required
        className="input-luxe flex-1"
      />
      <button
        type="submit"
        disabled={submitting}
        className="btn-secondary-luxe flex shrink-0 items-center gap-2 px-4 disabled:opacity-50"
      >
        <Bell className="h-4 w-4" />
        {submitting ? '...' : 'Notify Me'}
      </button>
    </form>
  );
}
