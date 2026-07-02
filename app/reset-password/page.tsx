'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase/client';
import { SiteShell } from '@/components/site/site-shell';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        // user is in recovery mode
      }
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      toast.error('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Password updated successfully!');
      router.push('/account');
    }
  };

  return (
    <SiteShell>
      <div className="container-luxe py-16 md:py-24">
        <div className="mx-auto max-w-md">
          <div className="text-center">
            <p className="section-label">Account</p>
            <h1 className="mt-2 font-serif text-4xl font-medium">Reset Password</h1>
            <div className="gold-divider mt-6" />
          </div>
          <form onSubmit={handleSubmit} className="card-luxe mt-8 p-8 space-y-4">
            <div>
              <label className="text-sm font-medium">New Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="input-luxe mt-1"
                placeholder="At least 6 characters"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Confirm Password</label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                className="input-luxe mt-1"
                placeholder="••••••••"
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary-luxe w-full disabled:opacity-50">
              {loading ? 'Updating...' : 'Update Password'}
            </button>
            <Link href="/auth" className="block text-center text-sm text-primary hover:text-accent">
              Back to Sign In
            </Link>
          </form>
        </div>
      </div>
    </SiteShell>
  );
}
