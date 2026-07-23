'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { PackagePlus, Lock } from 'lucide-react';
import { SiteShell } from '@/components/site/site-shell';
import { useProducts } from '@/lib/hooks/use-products';
import { useAuth } from '@/lib/auth-context';
import { useCart } from '@/lib/cart-context';
import { formatNaira } from '@/lib/format';
import type { Product } from '@/lib/types';

export default function BulkOrderPage() {
  const router = useRouter();
  const { user, isWholesale, loading } = useAuth();
  const { addToCart } = useCart();
  const { data: products, isLoading } = useProducts({ inStockOnly: true });
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);

  const setQty = (productId: string, value: number) => {
    setQuantities((prev) => ({ ...prev, [productId]: Math.max(0, value) }));
  };

  const selectedCount = Object.values(quantities).filter((q) => q > 0).length;
  const estimatedTotal = (products || []).reduce((sum: number, p: Product) => {
    const qty = quantities[p.id] || 0;
    return sum + qty * (p.wholesale_price || p.retail_price);
  }, 0);

  const handleAddAll = async () => {
    const toAdd = (products || []).filter((p: Product) => (quantities[p.id] || 0) > 0);
    if (toAdd.length === 0) {
      toast.error('Enter a quantity for at least one item');
      return;
    }

    setSubmitting(true);
    let addedCount = 0;
    let limitedCount = 0;

    for (const product of toAdd) {
      const qty = quantities[product.id];
      const result = await addToCart(product, qty);
      if (result.finalQuantity > 0) addedCount += 1;
      if (result.limited) limitedCount += 1;
    }

    setSubmitting(false);
    setQuantities({});

    if (limitedCount > 0) {
      toast.success(`Added ${addedCount} items to cart — ${limitedCount} were capped by available stock.`);
    } else {
      toast.success(`Added ${addedCount} items to cart.`);
    }
  };

  if (loading) {
    return (
      <SiteShell>
        <div className="container-luxe py-24 text-center text-muted-foreground">Loading...</div>
      </SiteShell>
    );
  }

  if (!user || !isWholesale) {
    return (
      <SiteShell>
        <div className="container-luxe py-24 text-center">
          <Lock className="mx-auto h-12 w-12 text-muted-foreground" />
          <h1 className="mt-4 font-serif text-3xl font-medium">Wholesale Access Only</h1>
          <p className="mt-2 text-muted-foreground">
            This bulk ordering tool is available to approved wholesale accounts.
          </p>
          <button onClick={() => router.push('/account')} className="mt-6 btn-primary-luxe">
            Go to My Account
          </button>
        </div>
      </SiteShell>
    );
  }

  return (
    <SiteShell>
      <div className="container-luxe py-12">
        <div className="text-center">
          <p className="section-label">Wholesale</p>
          <h1 className="mt-2 font-serif text-4xl font-medium md:text-5xl">Bulk Order</h1>
          <div className="gold-divider mt-6" />
          <p className="mt-6 text-muted-foreground">
            Set quantities across multiple pieces at once, then add them all to your cart together.
          </p>
        </div>

        {isLoading ? (
          <p className="mt-12 text-center text-muted-foreground">Loading products...</p>
        ) : (
          <div className="mt-12 overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="pb-3">Product</th>
                  <th className="pb-3">Wholesale Price</th>
                  <th className="pb-3">In Stock</th>
                  <th className="pb-3">Quantity</th>
                  <th className="pb-3 text-right">Line Total</th>
                </tr>
              </thead>
              <tbody>
                {products?.map((product: Product) => {
                  const price = product.wholesale_price || product.retail_price;
                  const qty = quantities[product.id] || 0;
                  return (
                    <tr key={product.id} className="border-b border-border/60">
                      <td className="py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-14 w-12 shrink-0 overflow-hidden rounded-[4px] bg-muted">
                            {product.images?.[0] && (
                              <img src={product.images[0]} alt={product.name} className="h-full w-full object-cover" />
                            )}
                          </div>
                          <span className="font-medium">{product.name}</span>
                        </div>
                      </td>
                      <td className="py-4 text-sm">{formatNaira(price)}</td>
                      <td className="py-4 text-sm text-muted-foreground">{product.stock}</td>
                      <td className="py-4">
                        <input
                          type="number"
                          min={0}
                          max={product.stock}
                          value={qty || ''}
                          onChange={(e) => setQty(product.id, parseInt(e.target.value) || 0)}
                          placeholder="0"
                          className="input-luxe w-20"
                        />
                      </td>
                      <td className="py-4 text-right text-sm font-medium">
                        {qty > 0 ? formatNaira(qty * price) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {products?.length === 0 && (
              <p className="py-12 text-center text-muted-foreground">No products currently in stock.</p>
            )}
          </div>
        )}

        {products && products.length > 0 && (
          <div className="card-luxe sticky bottom-4 mt-8 flex flex-wrap items-center justify-between gap-4 p-6">
            <div>
              <p className="text-sm text-muted-foreground">{selectedCount} item(s) selected</p>
              <p className="font-serif text-xl font-medium">Estimated Total: {formatNaira(estimatedTotal)}</p>
            </div>
            <button
              onClick={handleAddAll}
              disabled={submitting || selectedCount === 0}
              className="btn-primary-luxe flex items-center gap-2 disabled:opacity-50"
            >
              <PackagePlus className="h-4 w-4" />
              {submitting ? 'Adding...' : 'Add All to Cart'}
            </button>
          </div>
        )}
      </div>
    </SiteShell>
  );
}
