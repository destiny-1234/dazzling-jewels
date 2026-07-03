'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { useFlutterwave, closePaymentModal } from 'flutterwave-react-v3';
import { SiteShell } from '@/components/site/site-shell';
import { useCart } from '@/lib/cart-context';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase/client';
import { formatNaira } from '@/lib/format';

export default function CheckoutPage() {
  const router = useRouter();
  const { user, profile, canShop, isWholesalePending } = useAuth();
  const { lines, subtotal, clearCart } = useCart();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push('/auth');
      return;
    }
    if (isWholesalePending) {
      toast.error('Your wholesale account is pending admin approval. You cannot place orders until it is approved.');
      router.push('/account');
      return;
    }
    if (profile) {
      setName(profile.full_name || '');
      setEmail(profile.email || '');
      setPhone(profile.phone || '');
      setAddress(profile.address || '');
    }
  }, [user, profile, isWholesalePending, router]);

  const flutterwaveConfig = {
    public_key: process.env.NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY || 'FLWPUBK_TEST-XXXXXXXXXXXXXXXXXXXXXXXXXX',
    tx_ref: `fave-${Date.now()}`,
    amount: subtotal,
    currency: 'NGN',
    payment_options: 'card, banktransfer, ussd',
    customer: {
      email,
      phone_number: phone,
      name,
    },
    customizations: {
      title: 'Fave Dazzling Jewels',
      description: 'Hand-beaded luxury order',
      logo: '/images/IMG-20260313-WA0038.jpg',
    },
  };

  const handlePayment = useFlutterwave(flutterwaveConfig);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (isWholesalePending) {
      toast.error('Your wholesale account is pending admin approval. You cannot place orders until it is approved.');
      return;
    }
    if (lines.length === 0) {
      toast.error('Your cart is empty');
      return;
    }

    setLoading(true);

    try {
      // Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: user.id,
          total: subtotal,
          status: 'pending',
          payment_status: 'unpaid',
          shipping_name: name,
          shipping_email: email,
          shipping_phone: phone,
          shipping_address: address,
          notes,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = lines.map((line) => ({
        order_id: order.id,
        product_id: line.product.id,
        product_name: line.product.name,
        unit_price: line.product.retail_price,
        quantity: line.quantity,
        image: line.product.images?.[0] || null,
      }));

      const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
      if (itemsError) throw itemsError;

      // Initiate Flutterwave payment
      handlePayment({
        callback: async (response) => {
          closePaymentModal();

          if (response.status === 'successful') {
            // Don't trust the browser's word for it — ask our server to
            // verify this transaction with Flutterwave directly before
            // marking the order paid or touching stock.
            try {
              const { data: sessionData } = await supabase.auth.getSession();
              const token = sessionData.session?.access_token;

              const verifyRes = await fetch('/api/verify-payment', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({
                  order_id: order.id,
                  transaction_id: response.transaction_id,
                }),
              });
              const verifyResult = await verifyRes.json();

              if (!verifyRes.ok || !verifyResult.verified) {
                setLoading(false);
                toast.error(
                  'We could not confirm your payment with Flutterwave. If you were charged, contact us with your order reference and we will sort it out.'
                );
                return;
              }
            } catch {
              setLoading(false);
              toast.error('We could not confirm your payment. Please contact us if you were charged.');
              return;
            }

            // Clear cart
            await clearCart();

            toast.success('Payment successful! Your order has been placed.');
            router.push(`/order-confirmation/${order.id}`);
          } else {
            closePaymentModal();
            setLoading(false);
            toast.error('Payment was not successful. Please try again.');
          }
        },
        onClose: () => {
          setLoading(false);
        },
      });
    } catch (error: any) {
      setLoading(false);
      toast.error(error.message || 'Something went wrong. Please try again.');
    }
  };

  if (!user || isWholesalePending) {
    return (
      <SiteShell>
        <div className="container-luxe py-24 text-center">
          <p className="text-muted-foreground">Redirecting...</p>
        </div>
      </SiteShell>
    );
  }

  return (
    <SiteShell>
      <div className="container-luxe py-12">
        <div className="text-center">
          <p className="section-label">Almost There</p>
          <h1 className="mt-2 font-serif text-4xl font-medium md:text-5xl">Checkout</h1>
          <div className="gold-divider mt-6" />
        </div>

        <form onSubmit={handleCheckout} className="mt-12 grid gap-8 lg:grid-cols-[1fr_360px]">
          {/* Shipping form */}
          <div className="card-luxe p-6">
            <h2 className="font-serif text-xl font-medium">Shipping Details</h2>
            <div className="mt-6 space-y-4">
              <div>
                <label className="text-sm font-medium">Full Name</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className="input-luxe mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="input-luxe mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Phone</label>
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required className="input-luxe mt-1" placeholder="+234 ..." />
              </div>
              <div>
                <label className="text-sm font-medium">Delivery Address</label>
                <textarea value={address} onChange={(e) => setAddress(e.target.value)} required className="input-luxe mt-1 min-h-[80px]" placeholder="Street, city, state" />
              </div>
              <div>
                <label className="text-sm font-medium">Order Notes (optional)</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="input-luxe mt-1 min-h-[80px]" placeholder="Any special instructions..." />
              </div>
            </div>
          </div>

          {/* Order summary */}
          <div className="card-luxe h-fit p-6 lg:sticky lg:top-20">
            <h2 className="font-serif text-xl font-medium">Order Summary</h2>
            <div className="mt-4 space-y-3 border-b border-border pb-4">
              {lines.map((line) => (
                <div key={line.product.id} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {line.product.name} x{line.quantity}
                  </span>
                  <span className="font-medium">{formatNaira(line.product.retail_price * line.quantity)}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">{formatNaira(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Shipping</span>
                <span className="font-medium text-green-600">Free / Included</span>
              </div>
            </div>
            <div className="mt-4 flex justify-between border-t border-border pt-4">
              <span className="font-serif text-lg font-medium">Total</span>
              <span className="font-serif text-lg font-medium">{formatNaira(subtotal)}</span>
            </div>
            <button type="submit" disabled={loading || lines.length === 0} className="btn-primary-luxe mt-6 w-full disabled:opacity-50">
              {loading ? 'Processing...' : `Pay ${formatNaira(subtotal)}`}
            </button>
            <p className="mt-3 text-center text-xs text-muted-foreground">
              Secure payment via Flutterwave. Cards, bank transfer, USSD.
            </p>
          </div>
        </form>
      </div>
    </SiteShell>
  );
}
