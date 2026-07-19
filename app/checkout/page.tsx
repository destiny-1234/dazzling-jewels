'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { Check, ChevronsUpDown } from 'lucide-react';
import { SiteShell } from '@/components/site/site-shell';
import { useCart } from '@/lib/cart-context';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase/client';
import { formatNaira } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import type { DeliveryZone } from '@/lib/types';

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
  const [zoneOpen, setZoneOpen] = useState(false);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discountAmount: number } | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);

  const { data: zones } = useQuery<DeliveryZone[]>({
    queryKey: ['delivery-zones'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('delivery_zones')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });
      if (error) throw error;
      return data as DeliveryZone[];
    },
  });

  const selectedZone = zones?.find((z: DeliveryZone) => z.id === selectedZoneId) || null;
  const needsQuote = !!selectedZone && selectedZone.fee === null;
  const deliveryFee = selectedZone && !needsQuote ? Number(selectedZone.fee) : 0;
  const discountAmount = appliedCoupon?.discountAmount || 0;
  const discountedSubtotal = Math.max(0, subtotal - discountAmount);
  const total = discountedSubtotal + deliveryFee;

  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) return;
    setCouponLoading(true);
    try {
      const { data, error } = await supabase.rpc('validate_coupon', {
        p_code: couponInput.trim(),
        p_subtotal: subtotal,
      });
      if (error) throw error;
      const result = data?.[0];
      if (!result?.valid) {
        toast.error(result?.message || 'Invalid coupon code');
        setAppliedCoupon(null);
        return;
      }
      setAppliedCoupon({ code: couponInput.trim().toUpperCase(), discountAmount: Number(result.discount_amount) });
      toast.success(result.message || 'Coupon applied');
    } catch (err) {
      toast.error('Could not validate that coupon right now. Please try again.');
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput('');
  };

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
    if (!selectedZone) {
      toast.error('Please select your delivery zone');
      return;
    }

    setLoading(true);

    try {
      // Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: user.id,
          subtotal,
          total: needsQuote ? discountedSubtotal : total,
          status: 'pending',
          payment_status: 'unpaid',
          shipping_name: name,
          shipping_email: email,
          shipping_phone: phone,
          shipping_address: address,
          notes,
          delivery_zone_id: selectedZone.id,
          delivery_fee: needsQuote ? 0 : deliveryFee,
          delivery_status: needsQuote ? 'awaiting_quote' : 'quoted',
          coupon_code: appliedCoupon?.code || null,
          discount_amount: discountAmount,
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

      if (needsQuote) {
        // Delivery fee isn't known yet — hold off on payment entirely.
        // The admin will set a fee, then the customer pays from My Account.
        await clearCart();
        setLoading(false);
        toast.success('Order received! We will confirm your delivery fee shortly — check My Account for updates.');
        router.push(`/order-confirmation/${order.id}`);
        return;
      }

      // Initiate Paystack payment — loaded dynamically so it never runs
      // during Next.js's server-side build/prerender (it needs `window`,
      // which only exists in the browser).
      const { default: PaystackPop } = await import('@paystack/inline-js');
      const paystack = new PaystackPop();
      paystack.newTransaction({
        key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || 'pk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        email,
        amount: Math.round(total * 100), // Paystack expects kobo, not naira
        currency: 'NGN',
        reference: `fave-${Date.now()}`,
        metadata: {
          order_id: order.id,
          custom_fields: [{ display_name: 'Order ID', variable_name: 'order_id', value: order.id }],
        },
        onSuccess: async (transaction: { reference: string }) => {
          // Don't trust the browser's word for it — ask our server to
          // verify this transaction with Paystack directly before
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
                reference: transaction.reference,
              }),
            });
            const verifyResult = await verifyRes.json();

            if (!verifyRes.ok || !verifyResult.verified) {
              setLoading(false);
              toast.error(
                'We could not confirm your payment with Paystack. If you were charged, contact us with your order reference and we will sort it out.'
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
        },
        onCancel: () => {
          setLoading(false);
        },
        onError: () => {
          setLoading(false);
          toast.error('Payment was not successful. Please try again.');
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
                <label className="text-sm font-medium">Delivery Zone</label>
                <Popover open={zoneOpen} onOpenChange={setZoneOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      role="combobox"
                      aria-expanded={zoneOpen}
                      className="input-luxe mt-1 flex w-full items-center justify-between text-left font-normal"
                    >
                      <span className={selectedZone ? '' : 'text-muted-foreground'}>
                        {selectedZone ? selectedZone.name : 'Search for your area...'}
                      </span>
                      <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                    <Command>
                      <CommandInput placeholder="Search zones..." />
                      <CommandList>
                        <CommandEmpty>No matching zone.</CommandEmpty>
                        <CommandGroup>
                          {zones?.map((zone: DeliveryZone) => (
                            <CommandItem
                              key={zone.id}
                              value={zone.name}
                              onSelect={() => {
                                setSelectedZoneId(zone.id);
                                setZoneOpen(false);
                              }}
                            >
                              <Check className={cn('mr-2 h-4 w-4', selectedZoneId === zone.id ? 'opacity-100' : 'opacity-0')} />
                              {zone.name}
                              <span className="ml-auto text-xs text-muted-foreground">
                                {zone.fee === null ? 'Quote needed' : zone.fee === 0 ? 'Free' : formatNaira(zone.fee)}
                              </span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {needsQuote && (
                  <p className="mt-1.5 text-xs text-amber-600">
                    This area needs a custom delivery quote. Place your order now — we&apos;ll confirm the delivery fee shortly, then you can complete payment from My Account.
                  </p>
                )}
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
            <div className="mt-4 space-y-2 border-b border-border pb-4">
              <label className="text-sm font-medium">Coupon Code</label>
              {appliedCoupon ? (
                <div className="flex items-center justify-between rounded-[4px] border border-accent/40 bg-accent/5 px-3 py-2">
                  <span className="text-sm font-medium text-accent">{appliedCoupon.code} applied</span>
                  <button type="button" onClick={handleRemoveCoupon} className="text-xs text-muted-foreground underline">
                    Remove
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value)}
                    placeholder="Enter code"
                    className="input-luxe flex-1"
                  />
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    disabled={couponLoading || !couponInput.trim()}
                    className="btn-secondary-luxe shrink-0 px-4 disabled:opacity-50"
                  >
                    {couponLoading ? '...' : 'Apply'}
                  </button>
                </div>
              )}
            </div>
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">{formatNaira(subtotal)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Discount</span>
                  <span className="font-medium text-green-600">-{formatNaira(discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Delivery</span>
                {!selectedZone ? (
                  <span className="text-muted-foreground">Select a zone</span>
                ) : needsQuote ? (
                  <span className="text-amber-600">To be quoted</span>
                ) : deliveryFee === 0 ? (
                  <span className="font-medium text-green-600">Free</span>
                ) : (
                  <span className="font-medium">{formatNaira(deliveryFee)}</span>
                )}
              </div>
            </div>
            <div className="mt-4 flex justify-between border-t border-border pt-4">
              <span className="font-serif text-lg font-medium">Total</span>
              <span className="font-serif text-lg font-medium">
                {needsQuote ? formatNaira(discountedSubtotal) : formatNaira(total)}
              </span>
            </div>
            <button type="submit" disabled={loading || lines.length === 0 || !selectedZone} className="btn-primary-luxe mt-6 w-full disabled:opacity-50">
              {loading ? 'Processing...' : needsQuote ? 'Place Order (Pay After Quote)' : `Pay ${formatNaira(total)}`}
            </button>
            <p className="mt-3 text-center text-xs text-muted-foreground">
              Secure payment via Paystack. Cards, bank transfer, USSD.
            </p>
          </div>
        </form>
      </div>
    </SiteShell>
  );
}