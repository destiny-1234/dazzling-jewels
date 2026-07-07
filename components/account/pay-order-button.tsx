'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { useFlutterwave, closePaymentModal } from 'flutterwave-react-v3';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { formatNaira } from '@/lib/format';
import type { Order } from '@/lib/types';

export function PayOrderButton({ order }: { order: Order }) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);

  const config = {
    public_key: process.env.NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY || 'FLWPUBK_TEST-XXXXXXXXXXXXXXXXXXXXXXXXXX',
    tx_ref: `fave-resume-${order.id}-${Date.now()}`,
    amount: order.total,
    currency: 'NGN',
    payment_options: 'card,banktransfer,ussd',
    customer: {
      email: order.shipping_email || '',
      phone_number: order.shipping_phone || '',
      name: order.shipping_name || '',
    },
    customizations: {
      title: 'Fave Dazzling Jewels',
      description: `Order #${order.id.slice(0, 8).toUpperCase()} \u2014 delivery fee added`,
      logo: '/images/IMG-20260313-WA0038.jpg',
    },
  };

  const handlePayment = useFlutterwave(config);

  const pay = () => {
    setLoading(true);
    handlePayment({
      callback: async (response) => {
        closePaymentModal();

        if (response.status === 'successful') {
          try {
            const { data: sessionData } = await supabase.auth.getSession();
            const token = sessionData.session?.access_token;

            const verifyRes = await fetch('/api/verify-payment', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
              body: JSON.stringify({ order_id: order.id, transaction_id: response.transaction_id }),
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
        } else {
          closePaymentModal();
          setLoading(false);
          toast.error('Payment was not successful. Please try again.');
        }
      },
      onClose: () => setLoading(false),
    });
  };

  return (
    <button onClick={pay} disabled={loading} className="btn-primary-luxe px-4 py-2 text-sm disabled:opacity-50">
      {loading ? 'Processing...' : `Pay ${formatNaira(order.total)}`}
    </button>
  );
}
