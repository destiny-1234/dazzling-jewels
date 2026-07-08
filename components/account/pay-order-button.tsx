'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import PaystackPop from '@paystack/inline-js';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { formatNaira } from '@/lib/format';
import type { Order } from '@/lib/types';

export function PayOrderButton({ order }: { order: Order }) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);

  const pay = () => {
    setLoading(true);
    const paystack = new PaystackPop();
    paystack.newTransaction({
      key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || 'pk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      email: order.shipping_email || '',
      amount: Math.round(order.total * 100), // Paystack expects kobo, not naira
      currency: 'NGN',
      reference: `fave-resume-${order.id}-${Date.now()}`,
      metadata: {
        order_id: order.id,
        custom_fields: [{ display_name: 'Order ID', variable_name: 'order_id', value: order.id }],
      },
      onSuccess: async (transaction: { reference: string }) => {
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          const token = sessionData.session?.access_token;

          const verifyRes = await fetch('/api/verify-payment', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ order_id: order.id, reference: transaction.reference }),
          });
          const result = await verifyRes.json();

          if (!verifyRes.ok || !result.verified) {
            setLoading(false);
            toast.error('We could not confirm your payment. If you were charged, contact us with your order reference.');
            return;
          }
        } catch {
          setLoading(false);
          toast.error('We could not confirm your payment. Please contact us if you were charged.');
          return;
        }

        toast.success('Payment successful!');
        queryClient.invalidateQueries({ queryKey: ['orders'] }); // matches ['orders', user.id] prefix
        setLoading(false);
      },
      onCancel: () => {
        setLoading(false);
      },
      onError: () => {
        setLoading(false);
        toast.error('Payment was not successful. Please try again.');
      },
    });
  };

  return (
    <button onClick={pay} disabled={loading} className="btn-primary-luxe px-4 py-2 text-sm disabled:opacity-50">
      {loading ? 'Processing...' : `Pay ${formatNaira(order.total)}`}
    </button>
  );
}
