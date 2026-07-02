'use client';

import Link from 'next/link';
import { Target, Heart, ShieldCheck } from 'lucide-react';
import { SiteShell } from '@/components/site/site-shell';

export default function AboutPage() {
  return (
    <SiteShell>
      {/* Hero */}
      <section className="container-luxe py-16 md:py-24">
        <div className="grid items-center gap-12 md:grid-cols-2">
          <div className="animate-fade-in-up">
            {/* Logo */}
            <img
              src="/images/IMG-20260313-WA0038.jpg"
              alt="Fave Dazzling Jewels logo"
              className="h-24 w-24 rounded-full object-cover"
            />
            <p className="mt-6 section-label">Our Story</p>
            <h1 className="mt-2 font-serif text-4xl font-medium leading-tight md:text-5xl">
              Live in art. <span className="italic gold-text">Every bead tells a story.</span>
            </h1>
            <div className="gold-divider mt-6" />
            <p className="mt-6 leading-relaxed text-muted-foreground">
              Fave Dazzling Jewels was born from a love of craftsmanship and a deep pride in Nigerian artistry. In our Lagos studio, each bag begins as a vision and comes to life bead by bead, placed by the hands of artisans who have honed their craft over years of dedication.
            </p>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              We believe that luxury is not just about what you carry, but the story behind it. Every piece we create is a celebration of heritage, a tribute to the modern African woman, and a testament to the beauty that emerges when tradition meets contemporary design. From bridal clutches to statement totes, each bag is made to be treasured for generations.
            </p>
          </div>

          {/* Founder photo */}
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
      </section>

      {/* Mission / Values / Promise */}
      <section className="bg-cream-dark py-16 md:py-24">
        <div className="container-luxe">
          <div className="grid gap-8 md:grid-cols-3">
            {[
              { icon: Target, title: 'Our Mission', desc: 'To elevate Nigerian craftsmanship onto the global luxury stage, one hand-beaded piece at a time.' },
              { icon: Heart, title: 'Our Values', desc: 'Integrity in materials, respect for our artisans, and an unwavering commitment to quality above all else.' },
              { icon: ShieldCheck, title: 'Our Promise', desc: 'Every piece is made to be treasured. If you are not in love, we will make it right.' },
            ].map((item) => (
              <div key={item.title} className="card-luxe p-8 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-accent/30 bg-accent/5">
                  <item.icon className="h-6 w-6 text-accent" />
                </div>
                <h3 className="mt-4 font-serif text-2xl font-medium">{item.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container-luxe py-16 text-center md:py-24">
        <h2 className="font-serif text-4xl font-medium md:text-5xl">
          Hold a piece of the <span className="italic gold-text">story.</span>
        </h2>
        <div className="gold-divider mt-6" />
        <Link href="/shop" className="mt-8 inline-block btn-primary-luxe">
          Shop the Collection
        </Link>
      </section>
    </SiteShell>
  );
}
