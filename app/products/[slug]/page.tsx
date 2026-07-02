'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { Truck, ShieldCheck, Heart, MessageCircle, Minus, Plus } from 'lucide-react';
import { SiteShell } from '@/components/site/site-shell';
import { SignInGate } from '@/components/site/sign-in-gate';
import { useProductBySlug } from '@/lib/hooks/use-products';
import { useAuth } from '@/lib/auth-context';
import { useCart } from '@/lib/cart-context';
import { useSiteSettings } from '@/lib/hooks/use-site-settings';
import { formatNaira } from '@/lib/format';
import { supabase } from '@/lib/supabase/client';

export default function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const { user, isWholesale } = useAuth();
  const { addToCart } = useCart();
  const { data: settings } = useSiteSettings();
  const { data: product, isLoading } = useProductBySlug(slug as string);
  const [activeImage, setActiveImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [isWishlisted, setIsWishlisted] = useState(false);

  useEffect(() => {
    const checkWishlist = async () => {
      if (!user || !product) return;
      const { data } = await supabase
        .from('wishlist')
        .select('id')
        .eq('user_id', user.id)
        .eq('product_id', product.id)
        .maybeSingle();
      setIsWishlisted(!!data);
    };
    checkWishlist();
  }, [user, product]);

  if (isLoading) {
    return (
      <SiteShell>
        <div className="container-luxe py-24 text-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </SiteShell>
    );
  }

  if (!product) {
    return (
      <SiteShell>
        <div className="container-luxe py-24 text-center">
          <h1 className="font-serif text-3xl">Product not found</h1>
          <Link href="/shop" className="mt-4 inline-block btn-secondary-luxe">Back to Shop</Link>
        </div>
      </SiteShell>
    );
  }

  if (!user) {
    return (
      <SiteShell>
        <div className="container-luxe py-12">
          <SignInGate
            title="Sign in to view this piece"
            description="This piece is available exclusively to members. Sign in or create an account to view full details, pricing, and place an order."
          />
        </div>
      </SiteShell>
    );
  }

  const handleAddToCart = async () => {
    await addToCart(product, quantity);
    toast.success(`${product.name} added to cart`);
  };

  const handleWishlist = async () => {
    if (!user) return;
    if (isWishlisted) {
      await supabase.from('wishlist').delete().eq('user_id', user.id).eq('product_id', product.id);
      setIsWishlisted(false);
      toast.success('Removed from wishlist');
    } else {
      await supabase.from('wishlist').insert({ user_id: user.id, product_id: product.id });
      setIsWishlisted(true);
      toast.success('Saved to wishlist');
    }
  };

  const whatsappNumber = settings?.whatsapp_number || '2348012345678';
  const whatsappText = `Hello! I'm interested in the ${product.name} (${formatNaira(product.retail_price)}). Is it available?`;
  const whatsappHref = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappText)}`;

  const images = product.images?.length ? product.images : ['https://images.pexels.com/photos/1152077/pexels-photo-1152077.jpeg?auto=compress&cs=tinysrgb&w=800'];

  return (
    <SiteShell>
      <div className="container-luxe py-12">
        {/* Breadcrumb */}
        <nav className="mb-8 flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/" className="hover:text-accent">Home</Link>
          <span>/</span>
          <Link href="/shop" className="hover:text-accent">Shop</Link>
          <span>/</span>
          <span className="text-foreground">{product.name}</span>
        </nav>

        <div className="grid gap-12 lg:grid-cols-2">
          {/* Images */}
          <div>
            <div className="aspect-[4/5] overflow-hidden rounded-[4px] bg-muted shadow-luxe">
              <img
                src={images[activeImage]}
                alt={product.name}
                className="h-full w-full object-cover"
              />
            </div>
            {images.length > 1 && (
              <div className="mt-4 flex gap-3">
                {images.map((img: string, i: number) => (
                  <button
                    key={i}
                    onClick={() => setActiveImage(i)}
                    className={`h-20 w-16 overflow-hidden rounded-[4px] border-2 transition-colors ${
                      i === activeImage ? 'border-primary' : 'border-border'
                    }`}
                  >
                    <img src={img} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <div>
            {product.categories && (
              <p className="section-label">{product.categories.name}</p>
            )}
            <h1 className="mt-2 font-serif text-4xl font-medium md:text-5xl">{product.name}</h1>

            <div className="mt-4">
              <p className="text-2xl font-medium text-primary">{formatNaira(product.retail_price)}</p>
              {isWholesale && product.wholesale_price && (
                <p className="mt-1 text-sm text-accent">
                  Wholesale price: {formatNaira(product.wholesale_price)}
                </p>
              )}
            </div>

            <div className="mt-6">
              <p className="leading-relaxed text-muted-foreground">{product.description}</p>
            </div>

            {product.material && (
              <div className="mt-4">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">Materials</p>
                <p className="mt-1 text-sm">{product.material}</p>
              </div>
            )}

            {/* Stock status */}
            <div className="mt-4">
              {product.stock > 0 ? (
                <span className="inline-flex items-center gap-2 text-sm text-green-600">
                  <span className="h-2 w-2 rounded-full bg-green-500" />
                  In stock ({product.stock} available)
                </span>
              ) : (
                <span className="inline-flex items-center gap-2 text-sm text-destructive">
                  <span className="h-2 w-2 rounded-full bg-destructive" />
                  Sold out
                </span>
              )}
            </div>

            {/* Quantity + Add to Cart */}
            <div className="mt-8 flex items-center gap-4">
              <div className="flex items-center rounded-[4px] border border-border">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="px-3 py-2 text-muted-foreground hover:text-foreground"
                  aria-label="Decrease quantity"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="px-4 text-sm font-medium">{quantity}</span>
                <button
                  onClick={() => setQuantity((q) => q + 1)}
                  className="px-3 py-2 text-muted-foreground hover:text-foreground"
                  aria-label="Increase quantity"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <button
                onClick={handleAddToCart}
                disabled={product.stock === 0}
                className="btn-primary-luxe flex-1 disabled:opacity-50"
              >
                Add to Cart
              </button>
            </div>

            {/* WhatsApp + Wishlist */}
            <div className="mt-4 flex gap-3">
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary-luxe flex-1"
              >
                <MessageCircle className="mr-2 h-4 w-4" />
                WhatsApp Us
              </a>
              <button
                onClick={handleWishlist}
                className="flex items-center justify-center rounded-[4px] border border-border px-4 py-3 transition-colors hover:bg-muted"
                aria-label="Save to wishlist"
              >
                <Heart className={`h-5 w-5 ${isWishlisted ? 'fill-primary text-primary' : 'text-foreground'}`} />
              </button>
            </div>

            {/* Trust icons */}
            <div className="mt-8 flex flex-wrap gap-6 border-t border-border pt-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Truck className="h-5 w-5 text-accent" />
                Nationwide delivery
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ShieldCheck className="h-5 w-5 text-accent" />
                Quality guaranteed
              </div>
            </div>
          </div>
        </div>
      </div>
    </SiteShell>
  );
}
