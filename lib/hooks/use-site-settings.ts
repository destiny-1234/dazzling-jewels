'use client';

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import type { SiteSettings } from '@/lib/types';

export function useSiteSettings() {
  return useQuery<SiteSettings>({
    queryKey: ['site-settings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('site_settings').select('key, value');
      if (error) throw error;
      const settings: SiteSettings = {};
      (data || []).forEach((s) => {
        settings[s.key] = s.value || '';
      });
      return settings;
    },
    staleTime: 5 * 60 * 1000,
  });
}
