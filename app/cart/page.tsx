'use client';

import Link from 'next/link';
import { Minus, Plus, Trash2, ShoppingBag } from 'lucide-react';
import { toast } from 'sonner';
import { SiteShell } from '@/components/site/site-shell';
import { useCart } from '@/lib/cart-context';
import { useAuth } from '@/lib/auth-context';
import { formatNaira } from '@/lib/format';

export default function CartPage() {
  const { lines, subtotal, updateQuantity, removeFromCart, loading } = useCart();
  const { user } = useAuth();

  return (
    <SiteShell>
      <div className="container-luxe py-12">
        <div className="text-center">
          <p className="section-label">Your Selection</p>
          <h1 className="mt-2 font-serif text-4xl font-medium md:text-5xl">Shopping Cart</h1>
          <div className="gold-divider mt-6" />
        </div>

        {lines.length === 0 ? (
          <div className="card-luxe mx-auto mt-12 max-w-md p-12 text-center">
            <ShoppingBag className="mx-auto h-12 w-12 text-muted-foreground" />
            <h2 className="mt-4 font-serif text-2xl font-light">Your cart is empty</h2>
            <p className="mt-2 text-sm text-muted-foreground">Discover our hand-beaded collection and find your perfect piece.</p>
            <Link href="/shop" className="mt-6 inline-block btn-primary-luxe">
              Browse Collection
            </Link>
          </div>
        ) : (
          <div className="mt-12 grid gap-8 lg:grid-cols-[1fr_360px]">
            {/* Line items */}
            <div className="space-y-4">
              {lines.map((line) => (
                <div key={line.product.id} className="card-luxe flex gap-4 p-4">
                  <div className="h-28 w-24 shrink-0 overflow-hidden rounded-[4px] bg-muted">
                    {line.product.images?.[0] && (
                      <img src={line.product.images[0]} alt={line.product.name} className="h-full w-full object-cover" />
                    )}
                  </div>
                  <div className="flex flex-1 flex-col">
                    <div className="flex items-start justify-between">
                      <div>
                        <Link href={`/products/${line.product.slug}`} className="font-serif text-lg font-medium hover:text-accent">
                          {line.product.name}
                        </Link>
                        <p className="mt-1 text-sm text-muted-foreground">{formatNaira(line.product.retail_price)}</p>
                      </div>
                      <button
                        onClick={() => removeFromCart(line.product.id)}
                        className="text-muted-foreground transition-colors hover:text-destructive"
                        aria-label="Remove item"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-auto flex items-center justify-between">
                      <div className="flex items-center rounded-[4px] border border-border">
                        <button
                          onClick={() => updateQuantity(line.product.id, line.quantity - 1)}
                          className="px-3 py-1.5 text-muted-foreground hover:text-foreground"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="px-3 text-sm font-medium">{line.quantity}</span>
                        <button
                          onClick={async () => {
                            const result = await updateQuantity(line.product.id, line.quantity + 1);
                            if (result.limited) {
                              toast.error(`Only ${line.product.stock} in stock for ${line.product.name}`);
                            }
                          }}
                          disabled={line.quantity >= line.product.stock}
                          className="px-3 py-1.5 text-muted-foreground hover:text-foreground disabled:opacity-40"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                      <p className="font-medium">{formatNaira(line.product.retail_price * line.quantity)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Summary */}
            <div className="card-luxe h-fit p-6 lg:sticky lg:top-20">
              <h2 className="font-serif text-xl font-medium">Order Summary</h2>
              <div className="mt-4 space-y-3 border-b border-border pb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">{formatNaira(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Shipping</span>
                  <span className="font-medium text-green-600">Free / Included</span>
                </div>
              </div>
              <div className="mt-4 flex justify-between">
                <span className="font-serif text-lg font-medium">Total</span>
                <span className="font-serif text-lg font-medium">{formatNaira(subtotal)}</span>
              </div>
              {user ? (
                <Link href="/checkout" className="btn-primary-luxe mt-6 w-full">
                  Proceed to Checkout
                </Link>
              ) : (
                <Link href="/auth" className="btn-primary-luxe mt-6 w-full">
                  Sign in to Checkout
                </Link>
              )}
              <Link href="/shop" className="mt-3 block text-center text-sm text-primary hover:text-accent">
                Continue Shopping
              </Link>
            </div>
          </div>
        )}
      </div>
    </SiteShell>
  );
}