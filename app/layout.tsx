import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Providers } from '@/lib/providers';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Fave Dazzling Jewels — Bespoke Beaded Luxury',
  description: 'Hand-beaded luxury bags, clutches, and statement pieces, made by hand in Nigeria.',
  openGraph: {
    title: 'Fave Dazzling Jewels — Bespoke Beaded Luxury',
    description: 'Hand-beaded luxury bags, clutches, and statement pieces, made by hand in Nigeria.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
