'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase/admin-client';
import { AdminShell } from '@/components/admin/admin-shell';
import { useQuery, useQueryClient } from '@tanstack/react-query';

const settingKeys = [
  {
    key: 'whatsapp_number',
    label: 'WhatsApp Number',
    placeholder: '2348012345678',
  },
  {
    key: 'business_phone',
    label: 'Business Phone',
    placeholder: '+234 801 234 5678',
  },
  {
    key: 'business_email',
    label: 'Business Email',
    placeholder: 'hello@favedazzlingjewels.com',
  },
  {
    key: 'business_address',
    label: 'Business Address',
    placeholder: 'Lagos, Nigeria',
  },
  {
    key: 'instagram_url',
    label: 'Instagram URL',
    placeholder: 'https://instagram.com/...',
  },
  {
    key: 'facebook_url',
    label: 'Facebook URL',
    placeholder: 'https://facebook.com/...',
  },
  {
    key: 'tiktok_url',
    label: 'TikTok URL',
    placeholder: 'https://tiktok.com/@...',
  },
  {
    key: 'whatsapp_message',
    label: 'WhatsApp Default Message',
    placeholder: 'Hello! I am interested...',
  },
  {
    key: 'low_stock_threshold',
    label: 'Low Stock Alert Threshold',
    placeholder: '5',
  },
];

export default function AdminSettingsPage() {
  const queryClient = useQueryClient();
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const { data: settings } = useQuery({
    queryKey: ['site-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('site_settings')
        .select('key, value');

      if (error) throw error;

      const settings: Record<string, string> = {};

      (data || []).forEach((s) => {
        settings[s.key] = s.value || '';
      });

      return settings;
    },
  });

  useEffect(() => {
    if (settings) {
      setValues(settings);
    }
  }, [settings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    for (const { key } of settingKeys) {
      const value = values[key] || '';

      const { data: existing } = await supabase
        .from('site_settings')
        .select('id')
        .eq('key', key)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('site_settings')
          .update({ value })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('site_settings')
          .insert({ key, value });
      }
    }

    setSaving(false);
    toast.success('Settings saved');
    queryClient.invalidateQueries({
      queryKey: ['site-settings'],
    });
  };

  return (
    <AdminShell>
      <h1 className="font-serif text-3xl font-medium text-zinc-100">
        Settings
      </h1>

      <p className="mt-1 text-sm text-zinc-500">
        Manage global site settings
      </p>

      <form
        onSubmit={handleSave}
        className="mt-8 max-w-2xl space-y-4 rounded-lg border border-zinc-800 bg-zinc-900 p-6"
      >
        {settingKeys.map(({ key, label, placeholder }) => (
          <div key={key}>
            <label className="text-sm font-medium text-zinc-300">
              {label}
            </label>

            <input
              type="text"
              value={values[key] || ''}
              onChange={(e) =>
                setValues({
                  ...values,
                  [key]: e.target.value,
                })
              }
              placeholder={placeholder}
              className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-amber-500 focus:outline-none"
            />

            {key === 'low_stock_threshold' && (
              <p className="mt-1 text-xs text-zinc-500">
                You&apos;ll get an email at your <strong>Business Email</strong>{' '}
                whenever a product&apos;s stock drops to or below this number
                after an order.
              </p>
            )}
          </div>
        ))}

        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-amber-500 px-6 py-2.5 text-sm font-medium text-zinc-950 hover:bg-amber-400 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </form>
    </AdminShell>
  );
}