import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// A completely separate Supabase client instance for the /admin area, with
// its own storage key. This is deliberate: Supabase's auth client syncs
// session state across ALL tabs of the same origin via a BroadcastChannel
// named after the storage key. If the admin panel and the storefront shared
// one client (and therefore one storage key), having an admin tab and a
// customer tab open at the same time would cause session events from one
// to bleed into the other — e.g. a customer sign-in getting silently
// overwritten by an admin tab's background token refresh. Giving the admin
// client its own storage key puts it on its own channel, fully isolating
// admin sessions from customer sessions, no matter how many tabs are open.
declare global {
  interface Window {
    __faveAdminSupabaseClient?: SupabaseClient;
  }
}

function getAdminSupabaseClient(): SupabaseClient {
  if (typeof window === 'undefined') {
    return createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  if (!window.__faveAdminSupabaseClient) {
    window.__faveAdminSupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        storage: window.sessionStorage,
        storageKey: 'fave-dazzling-jewels-admin-auth',
      },
    });
  }

  return window.__faveAdminSupabaseClient;
}

export const supabase = getAdminSupabaseClient();
