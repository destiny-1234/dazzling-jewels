import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Fave Dazzling Jewels',
    short_name: 'Fave Jewels',
    description: 'Hand-beaded luxury bags, clutches, and statement pieces, made by hand in Nigeria.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#faf8f5',
    theme_color: '#651b2a',
    orientation: 'portrait',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
