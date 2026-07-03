'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ShieldCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase/admin-client';
import { useAdminAuth } from '@/lib/admin-auth-context';

export default function AdminLoginPage() {
  const router = useRouter();
  const { isAdmin, loading } = useAdminAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && isAdmin) {
      router.push('/admin/dashboard');
    }
  }, [isAdmin, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    // Same defensive clear as the customer sign-in — avoids a leftover
    // session's background refresh timer clobbering this fresh login.
    await supabase.auth.signOut({ scope: 'local' });

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setSubmitting(false);
      toast.error('Invalid credentials');
      return;
    }

    // Check if user has admin role
    const { data: rolesData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', data.user.id);

    const roles = (rolesData || []).map((r: any) => r.role);

    if (!roles.includes('admin')) {
      await supabase.auth.signOut();
      setSubmitting(false);
      toast.error('Not an admin account');
      return;
    }

    toast.success('Welcome back, admin');
    router.push('/admin/dashboard');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-md">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-amber-500/30 bg-amber-500/5">
            <ShieldCheck className="h-8 w-8 text-amber-400" />
          </div>
          <h1 className="mt-6 font-serif text-3xl font-medium text-zinc-100">Admin Access</h1>
          <p className="mt-2 text-sm text-zinc-500">Authorized personnel only</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4 rounded-lg border border-zinc-800 bg-zinc-900 p-8">
          <div>
            <label className="text-sm font-medium text-zinc-300">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-amber-500"
              placeholder="admin@favedazzlingjewels.com"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-zinc-300">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-amber-500"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-amber-500 px-4 py-2.5 text-sm font-medium text-zinc-950 transition-colors hover:bg-amber-400 disabled:opacity-50"
          >
            {submitting ? 'Verifying...' : 'Sign In'}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-zinc-600">
          Protected area. All access is logged.
        </p>
      </div>
    </div>
  );
}
