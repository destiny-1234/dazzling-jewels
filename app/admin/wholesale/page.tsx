'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Check, X } from 'lucide-react';
import { supabase } from '@/lib/supabase/admin-client';
import { AdminShell } from '@/components/admin/admin-shell';
import { formatDate } from '@/lib/format';
import type { Profile } from '@/lib/types';

export default function AdminWholesalePage() {
  const queryClient = useQueryClient();

  const { data: applications } = useQuery({
    queryKey: ['admin-wholesale'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('account_type', 'wholesale')
        .eq('account_status', 'pending')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Profile[];
    },
  });

  const updateStatus = async (id: string, status: 'approved' | 'rejected') => {
    const { error } = await supabase.from('profiles').update({ account_status: status }).eq('id', id);
    if (error) {
      toast.error('Failed to update application');
    } else {
      toast.success(`Application ${status}`);
      queryClient.invalidateQueries({ queryKey: ['admin-wholesale'] });
      queryClient.invalidateQueries({ queryKey: ['admin-profiles'] });
    }
  };

  return (
    <AdminShell>
      <h1 className="font-serif text-3xl font-medium text-zinc-100">Wholesale Queue</h1>
      <p className="mt-1 text-sm text-zinc-500">Review pending wholesale applications</p>

      {applications && applications.length > 0 ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {applications.map((app: Profile) => (
            <div key={app.id} className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-serif text-lg font-medium text-zinc-100">{app.full_name || 'Unknown'}</h3>
                  <p className="mt-1 text-sm text-zinc-400">{app.email}</p>
                </div>
                <span className="rounded-full bg-yellow-500/20 px-2.5 py-0.5 text-xs font-medium text-yellow-400">
                  Pending
                </span>
              </div>
              {app.phone && <p className="mt-3 text-sm text-zinc-400">{app.phone}</p>}
              {app.address && <p className="mt-1 text-sm text-zinc-400">{app.address}</p>}
              <p className="mt-3 text-xs text-zinc-500">Applied: {formatDate(app.created_at)}</p>
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => updateStatus(app.id, 'approved')}
                  className="flex flex-1 items-center justify-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-500"
                >
                  <Check className="h-4 w-4" />
                  Approve
                </button>
                <button
                  onClick={() => updateStatus(app.id, 'rejected')}
                  className="flex flex-1 items-center justify-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-500"
                >
                  <X className="h-4 w-4" />
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-8 rounded-lg border border-zinc-800 bg-zinc-900 p-12 text-center">
          <p className="text-sm text-zinc-500">No pending wholesale applications.</p>
        </div>
      )}
    </AdminShell>
  );
}
