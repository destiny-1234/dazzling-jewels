'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { CircleCheck as CheckCircle } from 'lucide-react';
import { SiteShell } from '@/components/site/site-shell';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { formatNaira, formatDate } from '@/lib/format';
import type { Order } from '@/lib/types';

export default function OrderConfirmationPage() {
  const { id } = useParams<{ id: string }>();

  const { data: order, isLoading } = useQuery<Order>({
    queryKey: ['order', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return data as Order;
    },
    enabled: !!id,
  });

  return (
    <SiteShell>
      <div className="container-luxe py-16 md:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-accent/30 bg-accent/5">
            <CheckCircle className="h-8 w-8 text-accent" />
          </div>
          <p className="mt-6 section-label">Order Confirmed</p>
          <h1 className="mt-2 font-serif text-4xl font-medium md:text-5xl">Thank you!</h1>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            Your order has been placed successfully. We will be in touch shortly with delivery details.
          </p>
          <div className="gold-divider mt-6" />
        </div>

        {isLoading ? (
          <div className="mt-12 text-center text-muted-foreground">Loading order details...</div>
        ) : order ? (
          <div className="card-luxe mx-auto mt-12 max-w-2xl p-8">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground">Order ID</p>
                <p className="mt-1 font-mono text-sm">{order.id.slice(0, 8).toUpperCase()}</p>
              </div>
              <div className="text-right">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">Date</p>
                <p className="mt-1 text-sm">{formatDate(order.created_at)}</p>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {order.order_items?.map((item: any) => (
                <div key={item.id} className="flex items-center gap-4">
                  <div className="h-16 w-14 overflow-hidden rounded-[4px] bg-muted">
                    {item.image && <img src={item.image} alt={item.product_name} className="h-full w-full object-cover" />}
                  </div>
                  <div className="flex-1">
                    <p className="font-serif text-base font-medium">{item.product_name}</p>
                    <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                  </div>
                  <p className="text-sm font-medium">{formatNaira(item.unit_price * item.quantity)}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 flex justify-between border-t border-border pt-4">
              <span className="font-serif text-lg font-medium">Total</span>
              <span className="font-serif text-lg font-medium">{formatNaira(order.total)}</span>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link href="/shop" className="btn-primary-luxe">Continue Shopping</Link>
              <Link href="/account" className="btn-secondary-luxe">View My Orders</Link>
            </div>
          </div>
        ) : (
          <div className="mt-12 text-center text-muted-foreground">Order not found.</div>
        )}
      </div>
    </SiteShell>
  );
}
