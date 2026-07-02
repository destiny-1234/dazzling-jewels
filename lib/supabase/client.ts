import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Force a true singleton, even if this module gets evaluated more than once
// across different Next.js bundle chunks. Without this, multiple independent
// GoTrueClient instances can end up sharing the same storage key and fire
// spurious SIGNED_OUT events at each other right after a real sign-in.
declare global {
  interface Window {
    __faveSupabaseClient?: SupabaseClient;
  }
}

function getSupabaseClient(): SupabaseClient {
  if (typeof window === 'undefined') {
    // Server-side: no shared global needed, one-off instance is fine.
    return createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  if (!window.__faveSupabaseClient) {
    window.__faveSupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        storage: window.sessionStorage,
        storageKey: 'fave-dazzling-jewels-auth',
      },
    });
  }

  return window.__faveSupabaseClient;
}

export const supabase = getSupabaseClient();
