'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search, SlidersHorizontal } from 'lucide-react';
import { SiteShell } from '@/components/site/site-shell';
import { useProducts, useCategories } from '@/lib/hooks/use-products';
import type { Product, Category } from '@/lib/types';
import { formatNaira } from '@/lib/format';

export default function ShopPage() {
  const { data: categories } = useCategories();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const PRICE_CEILING = 10000000; // ₦10,000,000 — comfortably above any realistic piece price
  const [maxPrice, setMaxPrice] = useState(PRICE_CEILING);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const { data: products, isLoading } = useProducts({
    category: category === 'all' ? undefined : category,
    search: search || undefined,
    // Only send a price cap once the user has actually pulled the slider
    // down from its max — otherwise every product should show by default.
    maxPrice: maxPrice < PRICE_CEILING ? maxPrice : undefined,
    inStockOnly,
  });

  return (
    <SiteShell>
      {/* Banner */}
      <section className="border-b border-border bg-cream-dark">
        <div className="container-luxe py-12 text-center md:py-16">
          <p className="section-label">The Collection</p>
          <h1 className="mt-2 font-serif text-4xl font-medium md:text-5xl">Hand-Beaded Bags</h1>
          <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">
            Explore our curated collection of hand-beaded luxury pieces, each crafted with intention by our Lagos artisans.
          </p>
          <div className="gold-divider mt-6" />
        </div>
      </section>

      <section className="container-luxe py-12">
          <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
            {/* Sidebar Filters */}
            <aside className={`${showFilters ? 'block' : 'hidden'} lg:block`}>
              <div className="card-luxe p-6 lg:sticky lg:top-20">
                <div className="flex items-center justify-between">
                  <h3 className="font-serif text-lg font-medium">Filters</h3>
                  <button onClick={() => setShowFilters(false)} className="lg:hidden text-sm text-muted-foreground">
                    Close
                  </button>
                </div>

                {/* Search */}
                <div className="mt-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search pieces..."
                      className="input-luxe pl-10"
                    />
                  </div>
                </div>

                {/* Category */}
                <div className="mt-6">
                  <h4 className="text-xs uppercase tracking-widest text-muted-foreground">Category</h4>
                  <div className="mt-3 space-y-2">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name="category"
                        checked={category === 'all'}
                        onChange={() => setCategory('all')}
                        className="text-primary"
                      />
                      All Categories
                    </label>
                    {categories?.map((cat: Category) => (
                      <label key={cat.id} className="flex items-center gap-2 text-sm">
                        <input
                          type="radio"
                          name="category"
                          checked={category === cat.slug}
                          onChange={() => setCategory(cat.slug)}
                          className="text-primary"
                        />
                        {cat.name}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Price Range */}
                <div className="mt-6">
                  <h4 className="text-xs uppercase tracking-widest text-muted-foreground">Max Price</h4>
                  <input
                    type="range"
                    min={10000}
                    max={PRICE_CEILING}
                    step={10000}
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(Number(e.target.value))}
                    className="mt-3 w-full accent-primary"
                  />
                  <p className="mt-1 text-sm font-medium">
                    {maxPrice >= PRICE_CEILING ? 'Any price' : formatNaira(maxPrice)}
                  </p>
                </div>

                {/* In Stock */}
                <div className="mt-6">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={inStockOnly}
                      onChange={(e) => setInStockOnly(e.target.checked)}
                      className="rounded border-border"
                    />
                    In stock only
                  </label>
                </div>
              </div>
            </aside>

            {/* Product Grid */}
            <div>
              <div className="mb-6 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {isLoading ? 'Loading...' : `${products?.length || 0} ${products?.length === 1 ? 'piece' : 'pieces'}`}
                </p>
                <button
                  onClick={() => setShowFilters(true)}
                  className="flex items-center gap-2 text-sm text-muted-foreground lg:hidden"
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  Filters
                </button>
              </div>

              {products && products.length > 0 ? (
                <div className="grid grid-cols-2 gap-6 md:grid-cols-3">
                  {products.map((product: Product) => (
                    <Link key={product.id} href={`/products/${product.slug}`} className="group">
                      <div className="card-luxe transition-transform duration-300 group-hover:-translate-y-1">
                        <div className="aspect-[4/5] overflow-hidden bg-muted">
                          {product.images?.[0] && (
                            <img
                              src={product.images[0]}
                              alt={product.name}
                              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                          )}
                        </div>
                        <div className="p-4">
                          <p className="text-xs uppercase tracking-widest text-muted-foreground">
                            {product.categories?.name}
                          </p>
                          <h3 className="mt-1 font-serif text-lg font-medium">{product.name}</h3>
                          <div className="mt-2 flex items-center justify-between">
                            <p className="text-sm font-medium text-primary">{formatNaira(product.retail_price)}</p>
                            {product.stock <= 3 && product.stock > 0 && (
                              <span className="text-xs text-destructive">Only {product.stock} left</span>
                            )}
                            {product.stock === 0 && (
                              <span className="text-xs text-destructive">Sold out</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="card-luxe p-12 text-center">
                  <p className="font-serif text-2xl font-light">No pieces found</p>
                  <p className="mt-2 text-sm text-muted-foreground">Try adjusting your filters to discover more.</p>
                </div>
              )}
            </div>
          </div>
      </section>
    </SiteShell>
  );
}
