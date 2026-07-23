'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Check, X, Trash2, Download } from 'lucide-react';
import { supabase } from '@/lib/supabase/admin-client';
import { AdminShell } from '@/components/admin/admin-shell';
import { formatDate } from '@/lib/format';
import { downloadCsv } from '@/lib/csv-export';
import type { Profile } from '@/lib/types';

export default function AdminUsersPage() {
  const queryClient = useQueryClient();

  const { data: profiles } = useQuery({
    queryKey: ['admin-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Profile[];
    },
  });

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from('profiles').update({ account_status: status }).eq('id', id);
    if (error) {
      toast.error('Failed to update status');
    } else {
      toast.success(`Account ${status}`);
      queryClient.invalidateQueries({ queryKey: ['admin-profiles'] });
    }
  };

  const deleteUser = async (id: string) => {
    if (!confirm('Delete this user? This permanently removes their login and profile — they will no longer be able to sign in.')) return;

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      toast.error('Your admin session has expired. Please sign in again.');
      return;
    }

    const { data, error } = await supabase.functions.invoke('delete-user', {
      body: { userId: id },
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (error || data?.error) {
      toast.error(data?.error || error?.message || 'Failed to delete user');
    } else {
      toast.success('User deleted');
      queryClient.invalidateQueries({ queryKey: ['admin-profiles'] });
    }
  };

  const statusColors: Record<string, string> = {
    approved: 'bg-green-500/20 text-green-400',
    pending: 'bg-yellow-500/20 text-yellow-400',
    rejected: 'bg-red-500/20 text-red-400',
  };

  return (
    <AdminShell>
      <h1 className="font-serif text-3xl font-medium text-zinc-100">Users</h1>
      <p className="mt-1 text-sm text-zinc-500">Manage customer accounts</p>

      <div className="mt-8 overflow-x-auto rounded-lg border border-zinc-800">
        <table className="w-full min-w-[640px]">
          <thead className="bg-zinc-900">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-400">Name</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-400">Email</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-400">Type</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-400">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-400">Joined</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-400">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800 bg-zinc-900/50">
            {profiles?.map((profile: Profile) => (
              <tr key={profile.id} className="hover:bg-zinc-800/50">
                <td className="px-4 py-3 text-sm text-zinc-200">{profile.full_name || '-'}</td>
                <td className="px-4 py-3 text-sm text-zinc-300">{profile.email}</td>
                <td className="px-4 py-3 text-sm text-zinc-300 capitalize">{profile.account_type}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[profile.account_status]}`}>
                    {profile.account_status}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-zinc-400">{formatDate(profile.created_at)}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    {profile.account_type === 'wholesale' && profile.account_status === 'pending' && (
                      <>
                        <button onClick={() => updateStatus(profile.id, 'approved')} className="rounded p-1.5 text-green-400 hover:bg-green-900/30" title="Approve">
                          <Check className="h-4 w-4" />
                        </button>
                        <button onClick={() => updateStatus(profile.id, 'rejected')} className="rounded p-1.5 text-red-400 hover:bg-red-900/30" title="Reject">
                          <X className="h-4 w-4" />
                        </button>
                      </>
                    )}
                    <button onClick={() => deleteUser(profile.id)} className="rounded p-1.5 text-zinc-400 hover:bg-red-900/30 hover:text-red-400">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
