'use client';

import Link from 'next/link';
import { Instagram, Facebook } from 'lucide-react';
import { useSiteSettings } from '@/lib/hooks/use-site-settings';

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.84-.1z" />
    </svg>
  );
}

export function Footer() {
  const { data: settings } = useSiteSettings();

  return (
    <footer className="bg-ink text-cream">
      <div className="container-luxe py-16">
        <div className="grid gap-12 md:grid-cols-4">
          {/* Brand */}
          <div className="md:col-span-1">
            <h3 className="font-serif text-2xl font-medium">
              Fave <span className="gold-text font-semibold">Dazzling</span> Jewels
            </h3>
            <p className="mt-4 text-sm leading-relaxed text-cream/70">
              Bespoke beaded luxury, hand-crafted in Nigeria. Every piece tells a story of artistry, heritage, and pride.
            </p>
            <div className="mt-6 flex gap-4">
              {settings?.instagram_url && (
                <a
                  href={settings.instagram_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                  className="text-cream/70 transition-colors hover:text-accent"
                >
                  <Instagram className="h-5 w-5" />
                </a>
              )}
              {settings?.facebook_url && (
                <a
                  href={settings.facebook_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Facebook"
                  className="text-cream/70 transition-colors hover:text-accent"
                >
                  <Facebook className="h-5 w-5" />
                </a>
              )}
              {settings?.tiktok_url && (
                <a
                  href={settings.tiktok_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="TikTok"
                  className="text-cream/70 transition-colors hover:text-accent"
                >
                  <TikTokIcon className="h-5 w-5" />
                </a>
              )}
            </div>
          </div>

          {/* Explore */}
          <div>
            <h4 className="text-xs uppercase tracking-[0.25em] text-accent">Explore</h4>
            <ul className="mt-4 space-y-3">
              <li><Link href="/shop" className="text-sm text-cream/70 transition-colors hover:text-accent">Shop All</Link></li>
              <li><Link href="/about" className="text-sm text-cream/70 transition-colors hover:text-accent">Our Story</Link></li>
              <li><Link href="/contact" className="text-sm text-cream/70 transition-colors hover:text-accent">Contact</Link></li>
              <li><Link href="/account" className="text-sm text-cream/70 transition-colors hover:text-accent">My Account</Link></li>
              <li><Link href="/admin/login" className="text-sm text-cream/40 transition-colors hover:text-accent">Admin</Link></li>
            </ul>
          </div>

          {/* Reach Us */}
          <div>
            <h4 className="text-xs uppercase tracking-[0.25em] text-accent">Reach Us</h4>
            <ul className="mt-4 space-y-3">
              {settings?.business_email && (
                <li><a href={`mailto:${settings.business_email}`} className="text-sm text-cream/70 transition-colors hover:text-accent">{settings.business_email}</a></li>
              )}
              {settings?.business_phone && (
                <li><span className="text-sm text-cream/70">{settings.business_phone}</span></li>
              )}
              {settings?.business_address && (
                <li><span className="text-sm text-cream/70">{settings.business_address}</span></li>
              )}
            </ul>
          </div>

          {/* Newsletter mini */}
          <div>
            <h4 className="text-xs uppercase tracking-[0.25em] text-accent">Join The List</h4>
            <p className="mt-4 text-sm text-cream/70">First access to new pieces, private sales, and stories from the studio.</p>
            <Link href="/#newsletter" className="mt-4 inline-block btn-secondary-luxe border-cream/30 text-cream hover:bg-cream hover:text-ink">
              Subscribe
            </Link>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-cream/10 pt-8 sm:flex-row">
          <p className="text-xs text-cream/50">
            &copy; {new Date().getFullYear()} Fave Dazzling Jewels. All rights reserved.
          </p>
          <p className="text-xs text-cream/50">Crafted with care, beaded by hand.</p>
        </div>
      </div>
    </footer>
  );
}
