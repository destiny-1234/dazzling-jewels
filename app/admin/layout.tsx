import type { Metadata } from 'next';
import { AdminAuthProvider } from '@/lib/admin-auth-context';

export const metadata: Metadata = {
  title: 'Fave Admin',
  manifest: '/admin-manifest.json',
  themeColor: '#09090b',
  icons: {
    icon: [
      { url: '/icons/admin-icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/admin-icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/icons/admin-apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black',
    title: 'Fave Admin',
  },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminAuthProvider>{children}</AdminAuthProvider>;
}
