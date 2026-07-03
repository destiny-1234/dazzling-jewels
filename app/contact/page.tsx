'use client';

import { useState, useEffect } from 'react';
import { Mail, Phone, MapPin, Clock, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { SiteShell } from '@/components/site/site-shell';
import { useSiteSettings } from '@/lib/hooks/use-site-settings';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase/client';

export default function ContactPage() {
  const { data: settings } = useSiteSettings();
  const { user, profile } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // Prefill from the signed-in profile so logged-in customers don't have to
  // retype their details, and so their thread shows up under My Account.
  useEffect(() => {
    if (profile) {
      setName((prev) => prev || profile.full_name || '');
      setEmail((prev) => prev || profile.email || '');
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase
      .from('contact_messages')
      .insert({ name, email, message, user_id: user?.id ?? null });
    setLoading(false);
    if (error) {
      toast.error('Something went wrong. Please try again.');
    } else {
      toast.success(
        user
          ? 'Message sent! You can follow the reply from My Account → Messages.'
          : 'Message sent! We will be in touch soon.'
      );
      setName('');
      setEmail('');
      setMessage('');
    }
  };

  const whatsappNumber = settings?.whatsapp_number || '2348012345678';
  const whatsappText = settings?.whatsapp_message || 'Hello! I would like to know more about your bags.';
  const whatsappHref = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappText)}`;

  const contactCards = [
    { icon: Mail, label: 'Email', value: settings?.business_email || 'hello@favedazzlingjewels.com', href: `mailto:${settings?.business_email || 'hello@favedazzlingjewels.com'}` },
    { icon: Phone, label: 'Phone', value: settings?.business_phone || '+234 801 234 5678', href: `tel:${settings?.business_phone || '+2348012345678'}` },
    { icon: MapPin, label: 'Address', value: settings?.business_address || 'Lagos, Nigeria', href: null },
  ];

  return (
    <SiteShell>
      <div className="container-luxe py-16 md:py-24">
        <div className="text-center">
          <p className="section-label">Say Hello</p>
          <h1 className="mt-2 font-serif text-4xl font-medium md:text-5xl">Let&apos;s talk beautiful bags.</h1>
          <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">
            Questions about a piece, custom orders, or wholesale? We would love to hear from you.
          </p>
          <div className="gold-divider mt-6" />
        </div>

        <div className="mt-12 grid gap-8 lg:grid-cols-2">
          {/* Left: Contact info */}
          <div className="space-y-4">
            {contactCards.map((card) => (
              <div key={card.label} className="card-luxe flex items-start gap-4 p-6">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-accent/30 bg-accent/5">
                  <card.icon className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">{card.label}</p>
                  {card.href ? (
                    <a href={card.href} className="mt-1 block font-serif text-lg font-medium hover:text-accent">
                      {card.value}
                    </a>
                  ) : (
                    <p className="mt-1 font-serif text-lg font-medium">{card.value}</p>
                  )}
                </div>
              </div>
            ))}

            {/* WhatsApp CTA */}
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="card-luxe flex items-center gap-4 p-6 transition-colors hover:border-accent/40"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-500">
                <MessageCircle className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground">WhatsApp</p>
                <p className="mt-1 font-serif text-lg font-medium">Chat with us directly</p>
              </div>
            </a>

            {/* Business hours */}
            <div className="card-luxe flex items-start gap-4 p-6">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-accent/30 bg-accent/5">
                <Clock className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground">Business Hours</p>
                <p className="mt-1 text-sm">Mon &ndash; Sat: 9am &ndash; 7pm WAT</p>
                <p className="text-sm text-muted-foreground">Sunday: Closed</p>
              </div>
            </div>
          </div>

          {/* Right: Contact form */}
          <div className="card-luxe p-8">
            <h2 className="font-serif text-2xl font-medium">Send a Message</h2>
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="text-sm font-medium">Name</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className="input-luxe mt-1" placeholder="Your name" />
              </div>
              <div>
                <label className="text-sm font-medium">Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="input-luxe mt-1" placeholder="you@example.com" />
              </div>
              <div>
                <label className="text-sm font-medium">Message</label>
                <textarea value={message} onChange={(e) => setMessage(e.target.value)} required className="input-luxe mt-1 min-h-[140px]" placeholder="How can we help you?" />
              </div>
              <button type="submit" disabled={loading} className="btn-primary-luxe w-full disabled:opacity-50">
                {loading ? 'Sending...' : 'Send Message'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </SiteShell>
  );
}
