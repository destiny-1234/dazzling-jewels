'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase/client';
import { SiteShell } from '@/components/site/site-shell';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      setSent(true);
      toast.success('Password reset link sent to your email.');
    }
  };

  return (
    <SiteShell>
      <div className="container-luxe py-16 md:py-24">
        <div className="mx-auto max-w-md">
          <div className="text-center">
            <p className="section-label">Account</p>
            <h1 className="mt-2 font-serif text-4xl font-medium">Forgot Password</h1>
            <div className="gold-divider mt-6" />
          </div>
          {sent ? (
            <div className="card-luxe mt-8 p-8 text-center">
              <p className="text-sm leading-relaxed text-muted-foreground">
                We have sent a password reset link to <span className="font-medium text-foreground">{email}</span>. Check your inbox and follow the link to reset your password.
              </p>
              <Link href="/auth" className="mt-6 inline-block btn-secondary-luxe">
                Back to Sign In
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="card-luxe mt-8 p-8">
              <p className="mb-6 text-sm leading-relaxed text-muted-foreground">
                Enter your email address and we will send you a link to reset your password.
              </p>
              <div>
                <label className="text-sm font-medium">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="input-luxe mt-1"
                  placeholder="you@example.com"
                />
              </div>
              <button type="submit" disabled={loading} className="btn-primary-luxe mt-6 w-full disabled:opacity-50">
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
              <Link href="/auth" className="mt-4 block text-center text-sm text-primary hover:text-accent">
                Back to Sign In
              </Link>
            </form>
          )}
        </div>
      </div>
    </SiteShell>
  );
}
