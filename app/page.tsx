'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Star, Truck, Sparkles, Heart, Package, Users } from 'lucide-react';
import { SiteShell } from '@/components/site/site-shell';
import { SignInGate } from '@/components/site/sign-in-gate';
import { useFeaturedProducts, useTestimonials } from '@/lib/hooks/use-products';
import type { Product, Testimonial } from '@/lib/types';
import { useAuth } from '@/lib/auth-context';
import { formatNaira } from '@/lib/format';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';

export default function HomePage() {
  const { user } = useAuth();
  const { data: featuredProducts } = useFeaturedProducts();
  const { data: testimonials } = useTestimonials();
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const [email, setEmail] = useState('');

  useEffect(() => {
    if (testimonials && testimonials.length > 1) {
      const interval = setInterval(() => {
        setActiveTestimonial((prev) => (prev + 1) % testimonials.length);
      }, 6000);
      return () => clearInterval(interval);
    }
  }, [testimonials]);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    const { error } = await supabase.from('newsletter_subscribers').insert({ email });
    if (error) {
      if (error.code === '23505') {
        toast.success('You are already on the list!');
      } else {
        toast.error('Something went wrong. Please try again.');
      }
    } else {
      toast.success('Welcome to the list! Check your inbox.');
      setEmail('');
    }
  };

  const whyChooseUs = [
    { icon: Sparkles, title: 'Hand-Beaded', desc: 'Every bead placed by skilled Lagos artisans.' },
    { icon: Heart, title: 'Heirloom Quality', desc: 'Built to be treasured and passed down.' },
    { icon: Truck, title: 'Nationwide Delivery', desc: 'Free delivery across Lagos, nationwide shipping.' },
    { icon: Package, title: 'Wholesale Welcome', desc: 'Special pricing for approved wholesale accounts.' },
  ];

  return (
    <SiteShell>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="container-luxe py-16 md:py-24">
          <div className="grid items-center gap-12 md:grid-cols-2">
            <div className="animate-fade-in-up">
              <p className="section-label">Bespoke Beaded Luxury</p>
              <h1 className="mt-4 font-serif text-5xl font-medium leading-[1.1] md:text-6xl lg:text-7xl">
                Beaded by hand.
                <br />
                <span className="italic gold-text">Worn with pride.</span>
              </h1>
              <p className="mt-6 max-w-md text-base leading-relaxed text-muted-foreground">
                Hand-beaded luxury bags, clutches, and statement pieces, crafted with intention by our artisans in Nigeria. Each piece is a celebration of heritage, artistry, and the modern African woman.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/shop" className="btn-primary-luxe">
                  Shop the Collection
                </Link>
                <Link href="/about" className="btn-secondary-luxe">
                  Our Story
                </Link>
              </div>
              <div className="mt-8 flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <div className="flex">
                    {[...Array(5)].map((_: number, i: number) => (
                      <Star key={i} className="h-4 w-4 fill-accent text-accent" />
                    ))}
                  </div>
                  <span className="text-sm text-muted-foreground">5.0 from 200+ customers</span>
                </div>
                <div className="h-4 w-px bg-border" />
                <span className="text-sm text-muted-foreground">Free Lagos delivery</span>
              </div>
            </div>

            {/* Founder/hero photo */}
            <div className="relative animate-fade-in">
              <div className="absolute inset-0 -z-10 translate-x-4 translate-y-4 rounded-[4px] bg-gradient-to-br from-accent/20 via-primary/15 to-accent/10 blur-2xl" />
              <div className="relative aspect-[5/6] overflow-hidden rounded-[4px] shadow-luxe-lg">
                {/* FOUNDER-PHOTO - swap file in /public/images/ if needed */}
                <img
                  src="/images/file_000000008e9871f4affc99d083994e36.png"
                  alt="Founder of Fave Dazzling Jewels"
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Collection */}
      <section className="py-16 md:py-24">
        <div className="container-luxe">
          <div className="flex items-end justify-between">
            <div>
              <p className="section-label">New Arrivals</p>
              <h2 className="mt-2 font-serif text-4xl font-medium md:text-5xl">Featured Pieces</h2>
            </div>
            <Link href="/shop" className="text-sm font-medium text-primary transition-colors hover:text-accent">
              View all &rarr;
            </Link>
          </div>
          <div className="gold-divider mt-6" />

          <div className="mt-12">
            {user ? (
              <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
                {featuredProducts?.map((product: Product) => (
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
                        <h3 className="font-serif text-lg font-medium">{product.name}</h3>
                        <p className="mt-1 text-sm font-medium text-primary">{formatNaira(product.retail_price)}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <SignInGate />
            )}
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="bg-cream-dark py-16 md:py-24">
        <div className="container-luxe">
          <div className="text-center">
            <p className="section-label">Why Choose Us</p>
            <h2 className="mt-2 font-serif text-4xl font-medium md:text-5xl">The Fave Difference</h2>
            <div className="gold-divider mt-6" />
          </div>
          <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {whyChooseUs.map((item) => (
              <div key={item.title} className="text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-accent/40 bg-background">
                  <item.icon className="h-7 w-7 text-accent" />
                </div>
                <h3 className="mt-4 font-serif text-xl font-medium">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 md:py-24">
        <div className="container-luxe">
          <div className="text-center">
            <p className="section-label">Love Letters</p>
            <h2 className="mt-2 font-serif text-4xl font-medium md:text-5xl">From Our Customers</h2>
            <div className="gold-divider mt-6" />
          </div>
          {testimonials && testimonials.length > 0 && (
            <div className="mx-auto mt-12 max-w-2xl text-center">
              <div className="flex justify-center gap-1">
                {[...Array(testimonials[activeTestimonial].rating)].map((_: number, i: number) => (
                  <Star key={i} className="h-5 w-5 fill-accent text-accent" />
                ))}
              </div>
              <blockquote className="mt-6 font-serif text-2xl font-light italic leading-relaxed">
                &ldquo;{testimonials[activeTestimonial].text}&rdquo;
              </blockquote>
              <p className="mt-6 text-sm font-medium">
                {testimonials[activeTestimonial].customer_name}
              </p>
              <p className="text-sm text-muted-foreground">
                {testimonials[activeTestimonial].location}
              </p>
              <div className="mt-8 flex justify-center gap-2">
                {testimonials.map((_: Testimonial, i: number) => (
                  <button
                    key={i}
                    onClick={() => setActiveTestimonial(i)}
                    className={`h-2 rounded-full transition-all ${
                      i === activeTestimonial ? 'w-8 bg-accent' : 'w-2 bg-border'
                    }`}
                    aria-label={`Testimonial ${i + 1}`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Newsletter */}
      <section id="newsletter" className="bg-ink py-16 md:py-24">
        <div className="container-luxe text-center">
          <p className="section-label text-accent">The List</p>
          <h2 className="mt-2 font-serif text-4xl font-medium text-cream md:text-5xl">First access. Always.</h2>
          <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-cream/70">
            Join our inner circle for early access to new pieces, private sales, and stories from the studio.
          </p>
          <form onSubmit={handleSubscribe} className="mx-auto mt-8 flex max-w-md flex-col gap-3 sm:flex-row">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Your email address"
              required
              className="flex-1 rounded-[4px] border border-cream/20 bg-cream/5 px-4 py-3 text-sm text-cream placeholder:text-cream/40 focus:outline-none focus:border-accent"
            />
            <button type="submit" className="btn-primary-luxe bg-accent text-ink hover:brightness-110">
              Subscribe
            </button>
          </form>
        </div>
      </section>
    </SiteShell>
  );
}
