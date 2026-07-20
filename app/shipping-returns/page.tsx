'use client';

import { useState } from 'react';
import { Truck, PackageCheck, ShieldCheck, Camera, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { SiteShell } from '@/components/site/site-shell';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth-context';

const MAX_PHOTOS = 4;

export default function ShippingReturnsPage() {
  const { user, profile } = useAuth();
  const [orderNumber, setOrderNumber] = useState('');
  const [name, setName] = useState(profile?.full_name || '');
  const [email, setEmail] = useState(profile?.email || '');
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files || []);
    const combined = [...files, ...picked].slice(0, MAX_PHOTOS);
    setFiles(combined);
    e.target.value = '';
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderNumber.trim() || !name.trim() || !email.trim() || !description.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    try {
      // Confirm this order number actually exists and belongs to this
      // email before accepting the claim — prevents fabricated numbers.
      const verifyRes = await fetch('/api/verify-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderNumber: orderNumber.trim(), email: email.trim() }),
      });
      const verifyResult = await verifyRes.json();

      if (!verifyRes.ok) {
        toast.error(verifyResult.error || 'Could not verify your order right now. Please try again.');
        setSubmitting(false);
        return;
      }
      if (!verifyResult.valid) {
        toast.error(
          "We couldn't find an order matching that order number and email. Double check both and try again."
        );
        setSubmitting(false);
        return;
      }

      const photoUrls: string[] = [];
      for (const file of files) {
        const ext = file.name.split('.').pop();
        const path = `${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('return-photos')
          .upload(path, file);
        if (uploadError) throw uploadError;
        const { data: publicUrlData } = supabase.storage.from('return-photos').getPublicUrl(path);
        photoUrls.push(publicUrlData.publicUrl);
      }

      const { error } = await supabase.from('return_requests').insert({
        user_id: user?.id || null,
        order_number: orderNumber.trim(),
        name: name.trim(),
        email: email.trim(),
        description: description.trim(),
        photo_urls: photoUrls,
      });
      if (error) throw error;

      setSubmitted(true);
      setOrderNumber('');
      setDescription('');
      setFiles([]);
      toast.success('Claim submitted — we\u2019ll review and get back to you shortly.');
    } catch (err) {
      console.error(err);
      toast.error('Something went wrong submitting your claim. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SiteShell>
      {/* Hero */}
      <section className="container-luxe py-16 md:py-24">
        <div className="mx-auto max-w-2xl text-center animate-fade-in-up">
          <p className="section-label">Policies</p>
          <h1 className="mt-2 font-serif text-4xl font-medium leading-tight md:text-5xl">
            Shipping <span className="italic gold-text">&amp; Returns</span>
          </h1>
          <div className="gold-divider mx-auto mt-6" />
          <p className="mt-6 leading-relaxed text-muted-foreground">
            Every piece is ready stock and ships from our Lagos studio. Here&apos;s what to expect from order to doorstep.
          </p>
        </div>
      </section>

      {/* Delivery timelines */}
      <section className="bg-cream-dark py-16 md:py-24">
        <div className="container-luxe">
          <div className="mx-auto max-w-3xl">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-accent/30 bg-accent/5">
                <Truck className="h-5 w-5 text-accent" />
              </div>
              <h2 className="font-serif text-2xl font-medium md:text-3xl">Delivery Timelines</h2>
            </div>
            <div className="mt-8 grid gap-6 sm:grid-cols-2">
              <div className="card-luxe p-6">
                <h3 className="font-serif text-lg font-medium">Lagos</h3>
                <p className="mt-2 text-2xl font-medium gold-text">1&ndash;3 business days</p>
                <p className="mt-2 text-sm text-muted-foreground">Free delivery within Lagos.</p>
              </div>
              <div className="card-luxe p-6">
                <h3 className="font-serif text-lg font-medium">Nationwide</h3>
                <p className="mt-2 text-2xl font-medium gold-text">3&ndash;7 business days</p>
                <p className="mt-2 text-sm text-muted-foreground">Shipped to every state, fee depends on your delivery zone.</p>
              </div>
            </div>
            <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
              All items are in stock and ship as soon as your order and payment are confirmed. Some locations require a custom delivery quote &mdash; if yours does, we&apos;ll confirm your fee shortly after checkout before dispatch. Delivery times are estimates and may occasionally vary due to courier delays outside our control.
            </p>
          </div>
        </div>
      </section>

      {/* Exchanges / Returns */}
      <section className="container-luxe py-16 md:py-24">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-accent/30 bg-accent/5">
              <PackageCheck className="h-5 w-5 text-accent" />
            </div>
            <h2 className="font-serif text-2xl font-medium md:text-3xl">Exchanges &amp; Returns</h2>
          </div>

          <p className="mt-6 leading-relaxed text-muted-foreground">
            Because each bag is hand-beaded and treated as a finished luxury piece, we do not offer refunds or returns for change of mind. We do, however, stand behind the quality of our craftsmanship:
          </p>

          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            <div className="card-luxe p-6 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-accent/30 bg-accent/5">
                <ShieldCheck className="h-5 w-5 text-accent" />
              </div>
              <h3 className="mt-4 font-serif text-lg font-medium">Damaged or Defective</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                We&apos;ll exchange or replace any item that arrives damaged or defective &mdash; at no extra cost to you.
              </p>
            </div>
            <div className="card-luxe p-6 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-accent/30 bg-accent/5">
                <Camera className="h-5 w-5 text-accent" />
              </div>
              <h3 className="mt-4 font-serif text-lg font-medium">Report Within 48 Hours</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Submit a claim below within 48 hours of delivery, with clear photos of the item and its packaging.
              </p>
            </div>
            <div className="card-luxe p-6 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-accent/30 bg-accent/5">
                <PackageCheck className="h-5 w-5 text-accent" />
              </div>
              <h3 className="mt-4 font-serif text-lg font-medium">Exchange, Not Refund</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Approved claims are resolved with a replacement or exchange rather than a cash refund.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Claim form */}
      <section className="bg-cream-dark py-16 md:py-24">
        <div className="container-luxe">
          <div className="mx-auto max-w-2xl">
            <h2 className="font-serif text-2xl font-medium md:text-3xl">Submit an Exchange Claim</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Tell us your order number, describe the issue, and attach a few photos. Our team reviews every claim and will follow up by email.
            </p>

            {submitted ? (
              <div className="card-luxe mt-8 p-8 text-center">
                <ShieldCheck className="mx-auto h-10 w-10 text-accent" />
                <h3 className="mt-4 font-serif text-xl font-medium">Claim received</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Thank you &mdash; we&apos;ve got your claim and will be in touch by email shortly.
                </p>
                <button
                  onClick={() => setSubmitted(false)}
                  className="mt-6 btn-secondary-luxe"
                >
                  Submit another claim
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="card-luxe mt-8 space-y-5 p-6 md:p-8">
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium">Order Number *</label>
                    <input
                      type="text"
                      value={orderNumber}
                      onChange={(e) => setOrderNumber(e.target.value)}
                      required
                      className="input-luxe mt-1"
                      placeholder="e.g. A1B2C3D4"
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                      Found in My Account &rarr; Orders (shown as #A1B2C3D4).
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Full Name *</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="input-luxe mt-1"
                      placeholder="Your name"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Email *</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="input-luxe mt-1"
                    placeholder="you@example.com"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">What happened? *</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                    className="input-luxe mt-1 min-h-[110px]"
                    placeholder="Describe the damage or defect you received..."
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Photos (up to {MAX_PHOTOS})</label>
                  <div className="mt-2 flex flex-wrap gap-3">
                    {files.map((file, i) => (
                      <div key={i} className="relative h-20 w-20 overflow-hidden rounded-[4px] border border-border">
                        <img
                          src={URL.createObjectURL(file)}
                          alt={`Upload ${i + 1}`}
                          className="h-full w-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removeFile(i)}
                          className="absolute right-0.5 top-0.5 rounded-full bg-ink/70 p-0.5 text-cream"
                          aria-label="Remove photo"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    {files.length < MAX_PHOTOS && (
                      <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-[4px] border border-dashed border-border text-muted-foreground hover:border-accent hover:text-accent">
                        <Camera className="h-5 w-5" />
                        <span className="text-[10px]">Add photo</span>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleFileChange}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary-luxe w-full disabled:opacity-50"
                >
                  {submitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Submitting...
                    </span>
                  ) : (
                    'Submit Claim'
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
