'use client';

import Link from 'next/link';
import { Truck, PackageCheck, ShieldCheck, Camera } from 'lucide-react';
import { SiteShell } from '@/components/site/site-shell';

export default function ShippingReturnsPage() {
  return (
    <SiteShell>
      {/* Hero */}
      <section className="container-luxe py-16 md:py-24">
        <div className="mx-auto max-w-2xl text-center animate-fade-in-up">
          <p className="section-label">Policies</p>
          <h1 className="mt-2 font-serif text-4xl font-medium leading-tight md:text-5xl">
            Shipping <span className="italic gold-text">&amp; Returns</span>
          </h1>
          <div className="gold-divider mx-auto mt-6" />
          <p className="mt-6 leading-relaxed text-muted-foreground">
            Every piece is ready stock and ships from our Lagos studio. Here&apos;s what to expect from order to doorstep.
          </p>
        </div>
      </section>

      {/* Delivery timelines */}
      <section className="bg-cream-dark py-16 md:py-24">
        <div className="container-luxe">
          <div className="mx-auto max-w-3xl">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-accent/30 bg-accent/5">
                <Truck className="h-5 w-5 text-accent" />
              </div>
              <h2 className="font-serif text-2xl font-medium md:text-3xl">Delivery Timelines</h2>
            </div>
            <div className="mt-8 grid gap-6 sm:grid-cols-2">
              <div className="card-luxe p-6">
                <h3 className="font-serif text-lg font-medium">Lagos</h3>
                <p className="mt-2 text-2xl font-medium gold-text">1&ndash;3 business days</p>
                <p className="mt-2 text-sm text-muted-foreground">Free delivery within Lagos.</p>
              </div>
              <div className="card-luxe p-6">
                <h3 className="font-serif text-lg font-medium">Nationwide</h3>
                <p className="mt-2 text-2xl font-medium gold-text">3&ndash;7 business days</p>
                <p className="mt-2 text-sm text-muted-foreground">Shipped to every state, fee depends on your delivery zone.</p>
              </div>
            </div>
            <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
              All items are in stock and ship as soon as your order and payment are confirmed. Some locations require a custom delivery quote &mdash; if yours does, we&apos;ll confirm your fee shortly after checkout before dispatch. Delivery times are estimates and may occasionally vary due to courier delays outside our control.
            </p>
          </div>
        </div>
      </section>

      {/* Exchanges / Returns */}
      <section className="container-luxe py-16 md:py-24">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-accent/30 bg-accent/5">
              <PackageCheck className="h-5 w-5 text-accent" />
            </div>
            <h2 className="font-serif text-2xl font-medium md:text-3xl">Exchanges &amp; Returns</h2>
          </div>

          <p className="mt-6 leading-relaxed text-muted-foreground">
            Because each bag is hand-beaded and treated as a finished luxury piece, we do not offer refunds or returns for change of mind. We do, however, stand behind the quality of our craftsmanship:
          </p>

          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            <div className="card-luxe p-6 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-accent/30 bg-accent/5">
                <ShieldCheck className="h-5 w-5 text-accent" />
              </div>
              <h3 className="mt-4 font-serif text-lg font-medium">Damaged or Defective</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                We&apos;ll exchange or replace any item that arrives damaged or defective &mdash; at no extra cost to you.
              </p>
            </div>
            <div className="card-luxe p-6 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-accent/30 bg-accent/5">
                <Camera className="h-5 w-5 text-accent" />
              </div>
              <h3 className="mt-4 font-serif text-lg font-medium">Report Within 48 Hours</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Contact us within 48 hours of delivery with clear photos of the item and its packaging.
              </p>
            </div>
            <div className="card-luxe p-6 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-accent/30 bg-accent/5">
                <PackageCheck className="h-5 w-5 text-accent" />
              </div>
              <h3 className="mt-4 font-serif text-lg font-medium">Exchange, Not Refund</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Approved claims are resolved with a replacement or exchange rather than a cash refund.
              </p>
            </div>
          </div>

          <p className="mt-8 text-sm leading-relaxed text-muted-foreground">
            To start a claim, reach out via our <Link href="/contact" className="text-accent underline underline-offset-4">contact page</Link> with your order number, photos, and a short description of the issue within 48 hours of delivery. We&apos;ll review and get back to you promptly.
          </p>
        </div>
      </section>
    </SiteShell>
  );
}
