'use client';

import Link from 'next/link';
import { Clock } from 'lucide-react';

interface WholesalePendingGateProps {
  title?: string;
  description?: string;
}

export function WholesalePendingGate({
  title = 'Your wholesale account is under review',
  description = 'Thanks for applying for a wholesale account. An admin needs to approve your application before you can browse pricing, add items to your cart, or place an order. We will notify you once you are approved.',
}: WholesalePendingGateProps) {
  return (
    <div className="relative">
      {/* Blurred preview skeleton */}
      <div className="pointer-events-none select-none blur-sm opacity-40">
        <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card-luxe">
              <div className="aspect-[4/5] bg-muted" />
              <div className="p-4">
                <div className="h-4 w-3/4 rounded bg-muted" />
                <div className="mt-2 h-4 w-1/2 rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Gate card overlay */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="card-luxe max-w-md p-8 text-center shadow-luxe-lg">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-accent/30 bg-accent/5">
            <Clock className="h-6 w-6 text-accent" />
          </div>
          <p className="mt-4 section-label">Pending Approval</p>
          <h3 className="mt-2 font-serif text-2xl font-medium">{title}</h3>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{description}</p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link href="/account" className="btn-primary-luxe">
              View Account Status
            </Link>
            <Link href="/contact" className="btn-secondary-luxe">
              Contact Us
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
