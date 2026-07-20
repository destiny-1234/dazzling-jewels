import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Providers } from '@/lib/providers';
import { ServiceWorkerRegister } from '@/components/pwa-register';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Fave Dazzling Jewels — Bespoke Beaded Luxury',
  description: 'Hand-beaded luxury bags, clutches, and statement pieces, made by hand in Nigeria.',
  openGraph: {
    title: 'Fave Dazzling Jewels — Bespoke Beaded Luxury',
    description: 'Hand-beaded luxury bags, clutches, and statement pieces, made by hand in Nigeria.',
  },
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/icons/apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Fave Jewels',
  },
  themeColor: '#651b2a',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ServiceWorkerRegister />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
