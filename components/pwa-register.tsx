'use client';

import { useEffect } from 'react';

export function ServiceWorkerRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Non-critical — the site works fine without it, this just enables
        // the "Add to Home Screen" install prompt and static asset caching.
      });
    }
  }, []);

  return null;
}
