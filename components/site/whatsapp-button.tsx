'use client';

import { MessageCircle } from 'lucide-react';
import { useSiteSettings } from '@/lib/hooks/use-site-settings';

export function WhatsAppButton() {
  const { data: settings } = useSiteSettings();
  const number = settings?.whatsapp_number || '2348012345678';
  const message = settings?.whatsapp_message || 'Hello! I am interested in your beautiful hand-beaded bags.';
  const href = `https://wa.me/${number}?text=${encodeURIComponent(message)}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat on WhatsApp"
      className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-green-500 to-green-600 text-white shadow-lg transition-transform hover:scale-110 animate-pulse-ring"
    >
      <MessageCircle className="h-7 w-7" />
    </a>
  );
}
