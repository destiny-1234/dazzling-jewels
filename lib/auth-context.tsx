'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import type { Profile, UserRole } from '@/lib/types';

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: UserRole[];
  isAdmin: boolean;
  isWholesale: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  session: null,
  profile: null,
  roles: [],
  isAdmin: false,
  isWholesale: false,
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<UserRole[]>([]);
  
  // Start loading as true, and keep it true until initialized
  const [isInitialized, setIsInitialized] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadProfileAndRoles = useCallback(async (uid: string) => {
    try {
      const [{ data: profileData }, { data: rolesData }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', uid).maybeSingle(),
        supabase.from('user_roles').select('role').eq('user_id', uid),
      ]);
      return {
        profile: profileData as Profile | null,
        roles: (rolesData || []).map((r: any) => r.role as UserRole)
      };
    } catch (e) {
      console.error("Error loading profile/roles:", e);
      return { profile: null, roles: [] };
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) {
      const data = await loadProfileAndRoles(user.id);
      setProfile(data.profile);
      setRoles(data.roles);
    }
  }, [user, loadProfileAndRoles]);

  useEffect(() => {
    let mounted = true;

    const handleAuthSession = async (currentSession: Session | null) => {
      if (!mounted) return;

      if (currentSession?.user) {
        const { profile, roles } = await loadProfileAndRoles(currentSession.user.id);
        if (!mounted) return;

        setSession(currentSession);
        setUser(currentSession.user);
        setProfile(profile);
        setRoles(roles);
      } else {
        setSession(null);
        setUser(null);
        setProfile(null);
        setRoles([]);
      }
      setLoading(false);
      setIsInitialized(true);
    };

    // 1. Initial Session Hydration Check
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleAuthSession(session);
    });

    // 2. State Changed Listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setSession(null);
        setUser(null);
        setProfile(null);
        setRoles([]);
        setLoading(false);
        setIsInitialized(true);
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        setLoading(true); // Force loading back to true while pulling profile data
        handleAuthSession(session);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadProfileAndRoles]);

  const signOut = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRoles([]);
    setLoading(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        roles,
        isAdmin: roles.includes('admin'),
        isWholesale: profile?.account_type === 'wholesale' && profile?.account_status === 'approved',
        // Expose a combined state so route gates never run prematurely
        loading: !isInitialized || loading,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
