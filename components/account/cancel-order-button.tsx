'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/lib/supabase/client';
import type { Order } from '@/lib/types';

export function CancelOrderButton({ order }: { order: Order }) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);

  const cancel = async () => {
    setLoading(true);
    const { error } = await supabase.rpc('cancel_own_order', { p_order_id: order.id });
    setLoading(false);

    if (error) {
      toast.error('Could not cancel this order. Please contact us if the issue persists.');
      return;
    }

    toast.success('Order cancelled');
    queryClient.invalidateQueries({ queryKey: ['orders'] }); // matches ['orders', user.id] prefix
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button disabled={loading} className="btn-secondary-luxe px-4 py-2 text-sm disabled:opacity-50">
          {loading ? 'Cancelling...' : 'Cancel Order'}
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancel this order?</AlertDialogTitle>
          <AlertDialogDescription>
            This order will be marked as cancelled and you won&apos;t be able to pay for it. You can place a new order anytime.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep Order</AlertDialogCancel>
          <AlertDialogAction onClick={cancel}>Yes, Cancel</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
