'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase/client';
import { SiteShell } from '@/components/site/site-shell';
import { Sparkles, Bookmark, TrendingUp } from 'lucide-react';

export default function AuthPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<'signin' | 'signup'>(searchParams.get('tab') === 'signup' ? 'signup' : 'signin');

  // Sign in state
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  // Sign up state
  const [signUpName, setSignUpName] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [signUpConfirm, setSignUpConfirm] = useState('');
  const [accountType, setAccountType] = useState<'retail' | 'wholesale'>('retail');

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) router.push('/account');
    };
    checkSession();
  }, [router]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: signInEmail,
      password: signInPassword,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message === 'Invalid login credentials' ? 'Invalid email or password' : error.message);
    } else {
      toast.success('Welcome back!');
      router.push('/account');
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (signUpPassword !== signUpConfirm) {
      toast.error('Passwords do not match');
      return;
    }
    if (signUpPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: signUpEmail,
      password: signUpPassword,
      options: {
        data: {
          full_name: signUpName,
          account_type: accountType,
        },
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else if (data.user) {
      if (accountType === 'wholesale') {
        toast.success('Account created! Your wholesale application is pending review.');
      } else {
        toast.success('Welcome to Fave Dazzling Jewels!');
      }
      router.push('/account');
    }
  };

  return (
    <SiteShell>
      <div className="container-luxe py-16 md:py-24">
        <div className="grid gap-12 lg:grid-cols-2">
          {/* Left: Marketing copy */}
          <div className="flex flex-col justify-center">
            <p className="section-label">Members Only</p>
            <h1 className="mt-4 font-serif text-4xl font-medium md:text-5xl">
              The <span className="gold-text italic">inner circle</span> of beaded luxury.
            </h1>
            <p className="mt-6 max-w-md text-base leading-relaxed text-muted-foreground">
              Join our community of discerning collectors. Members enjoy exclusive access to new pieces, the ability to save favorites, track orders, and apply for wholesale pricing.
            </p>
            <div className="mt-8 space-y-4">
              {[
                { icon: Bookmark, title: 'Save Favorites', desc: 'Build your personal wishlist of coveted pieces.' },
                { icon: TrendingUp, title: 'Track Orders', desc: 'Follow your pieces from studio to doorstep.' },
                { icon: Sparkles, title: 'Wholesale Access', desc: 'Apply for special pricing on bulk orders.' },
              ].map((item) => (
                <div key={item.title} className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-accent/30 bg-accent/5">
                    <item.icon className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <h3 className="font-serif text-lg font-medium">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Auth card */}
          <div className="flex items-center justify-center">
            <div className="card-luxe w-full max-w-md p-8">
              {/* Tabs */}
              <div className="flex border-b border-border">
                <button
                  onClick={() => setTab('signin')}
                  className={`flex-1 pb-3 text-sm font-medium tracking-wide transition-colors ${
                    tab === 'signin' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'
                  }`}
                >
                  Sign In
                </button>
                <button
                  onClick={() => setTab('signup')}
                  className={`flex-1 pb-3 text-sm font-medium tracking-wide transition-colors ${
                    tab === 'signup' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'
                  }`}
                >
                  Create Account
                </button>
              </div>

              {tab === 'signin' ? (
                <form onSubmit={handleSignIn} className="mt-6 space-y-4">
                  <div>
                    <label className="text-sm font-medium">Email</label>
                    <input
                      type="email"
                      value={signInEmail}
                      onChange={(e) => setSignInEmail(e.target.value)}
                      required
                      className="input-luxe mt-1"
                      placeholder="you@example.com"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Password</label>
                    <input
                      type="password"
                      value={signInPassword}
                      onChange={(e) => setSignInPassword(e.target.value)}
                      required
                      className="input-luxe mt-1"
                      placeholder="••••••••"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-sm text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="rounded border-border"
                      />
                      Remember me
                    </label>
                    <Link href="/forgot-password" className="text-sm text-primary hover:text-accent">
                      Forgot password?
                    </Link>
                  </div>
                  <button type="submit" disabled={loading} className="btn-primary-luxe w-full disabled:opacity-50">
                    {loading ? 'Signing in...' : 'Sign In'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleSignUp} className="mt-6 space-y-4">
                  <div>
                    <label className="text-sm font-medium">Full Name</label>
                    <input
                      type="text"
                      value={signUpName}
                      onChange={(e) => setSignUpName(e.target.value)}
                      required
                      className="input-luxe mt-1"
                      placeholder="Your full name"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Email</label>
                    <input
                      type="email"
                      value={signUpEmail}
                      onChange={(e) => setSignUpEmail(e.target.value)}
                      required
                      className="input-luxe mt-1"
                      placeholder="you@example.com"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Password</label>
                    <input
                      type="password"
                      value={signUpPassword}
                      onChange={(e) => setSignUpPassword(e.target.value)}
                      required
                      className="input-luxe mt-1"
                      placeholder="At least 6 characters"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Confirm Password</label>
                    <input
                      type="password"
                      value={signUpConfirm}
                      onChange={(e) => setSignUpConfirm(e.target.value)}
                      required
                      className="input-luxe mt-1"
                      placeholder="••••••••"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Account Type</label>
                    <div className="mt-2 grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setAccountType('retail')}
                        className={`rounded-[4px] border p-3 text-sm transition-colors ${
                          accountType === 'retail'
                            ? 'border-primary bg-primary/5 text-primary'
                            : 'border-border text-muted-foreground'
                        }`}
                      >
                        Retail
                      </button>
                      <button
                        type="button"
                        onClick={() => setAccountType('wholesale')}
                        className={`rounded-[4px] border p-3 text-sm transition-colors ${
                          accountType === 'wholesale'
                            ? 'border-primary bg-primary/5 text-primary'
                            : 'border-border text-muted-foreground'
                        }`}
                      >
                        Wholesale
                      </button>
                    </div>
                    {accountType === 'wholesale' && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        Wholesale accounts require admin approval before wholesale pricing is unlocked.
                      </p>
                    )}
                  </div>
                  <button type="submit" disabled={loading} className="btn-primary-luxe w-full disabled:opacity-50">
                    {loading ? 'Creating account...' : 'Create Account'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </SiteShell>
  );
}
