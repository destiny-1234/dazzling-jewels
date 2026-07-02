'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Menu, X, Search, User, ShoppingBag } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useCart } from '@/lib/cart-context';
import { cn } from '@/lib/utils';

export function Header() {
  const pathname = usePathname();
  const { user, profile } = useAuth();
  const { count } = useCart();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/shop', label: 'Shop' },
    { href: '/about', label: 'About' },
    { href: '/contact', label: 'Contact' },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="container-luxe">
          <div className="flex h-16 items-center justify-between">
            {/* Logo + Wordmark */}
            <Link href="/" className="flex items-center gap-3">
              {/* LOGO IMAGE - swap file in /public/images/ if needed */}
              <img
                src="/images/IMG-20260313-WA0038.jpg"
                alt="Fave Dazzling Jewels logo"
                className="h-10 w-10 rounded-full object-cover"
                width={40}
                height={40}
              />
              <span className="font-serif text-xl font-medium tracking-tight">
                Fave <span className="gold-text font-semibold">Dazzling</span> Jewels
              </span>
            </Link>

            {/* Center Nav */}
            <nav className="hidden items-center gap-8 md:flex">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'text-sm font-medium tracking-wide transition-colors hover:text-accent',
                    pathname === link.href ? 'text-accent' : 'text-foreground'
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Right Icons */}
            <div className="flex items-center gap-4">
              <Link href="/shop" aria-label="Search" className="hidden sm:block">
                <Search className="h-5 w-5 text-foreground transition-colors hover:text-accent" />
              </Link>
              <Link
                href={user ? '/account' : '/auth'}
                aria-label="Account"
                className="hidden sm:block"
              >
                <User className="h-5 w-5 text-foreground transition-colors hover:text-accent" />
              </Link>
              <Link href="/cart" aria-label="Cart" className="relative">
                <ShoppingBag className="h-5 w-5 text-foreground transition-colors hover:text-accent" />
                {count > 0 && (
                  <span className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
                    {count}
                  </span>
                )}
              </Link>
              <button
                onClick={() => setMobileOpen(true)}
                className="md:hidden"
                aria-label="Open menu"
              >
                <Menu className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 bg-ink text-cream">
          <div className="container-luxe flex h-16 items-center justify-between">
            <span className="font-serif text-xl">
              Fave <span className="gold-text font-semibold">Dazzling</span> Jewels
            </span>
            <button onClick={() => setMobileOpen(false)} aria-label="Close menu">
              <X className="h-6 w-6" />
            </button>
          </div>
          <nav className="container-luxe mt-12 flex flex-col gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="font-serif text-3xl font-light tracking-tight transition-colors hover:text-accent"
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-8 flex flex-col gap-4 border-t border-cream/20 pt-8">
              {user ? (
                <>
                  <Link
                    href="/account"
                    onClick={() => setMobileOpen(false)}
                    className="text-sm uppercase tracking-widest text-cream/70"
                  >
                    {profile?.full_name || 'My Account'}
                  </Link>
                  <Link
                    href="/auth"
                    onClick={() => setMobileOpen(false)}
                    className="text-sm uppercase tracking-widest text-cream/70"
                  >
                    Sign Out
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/auth"
                    onClick={() => setMobileOpen(false)}
                    className="text-sm uppercase tracking-widest text-cream/70"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/auth?tab=signup"
                    onClick={() => setMobileOpen(false)}
                    className="text-sm uppercase tracking-widest text-cream/70"
                  >
                    Create Account
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
