'use client';

import Link from 'next/link';
import { Lock } from 'lucide-react';

interface SignInGateProps {
  title?: string;
  description?: string;
}

export function SignInGate({
  title = 'Sign in to view the collection',
  description = 'Our pieces are available exclusively to members. Sign in or create an account to browse the full collection, save favorites, and place orders.',
}: SignInGateProps) {
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
            <Lock className="h-6 w-6 text-accent" />
          </div>
          <p className="mt-4 section-label">Members Only</p>
          <h3 className="mt-2 font-serif text-2xl font-medium">{title}</h3>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{description}</p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link href="/auth" className="btn-primary-luxe">
              Sign In
            </Link>
            <Link href="/auth?tab=signup" className="btn-secondary-luxe">
              Create Account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
