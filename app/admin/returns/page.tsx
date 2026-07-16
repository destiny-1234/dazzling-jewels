'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { PackageOpen, Trash2, Mail } from 'lucide-react';
import { supabase } from '@/lib/supabase/admin-client';
import { AdminShell } from '@/components/admin/admin-shell';
import { formatDate } from '@/lib/format';
import type { ReturnRequest, ReturnRequestStatus } from '@/lib/types';

const STATUS_STYLES: Record<ReturnRequestStatus, string> = {
  new: 'bg-amber-500/20 text-amber-400',
  reviewing: 'bg-blue-500/20 text-blue-400',
  resolved: 'bg-emerald-500/20 text-emerald-400',
};

export default function AdminReturnsPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'all' | ReturnRequestStatus>('all');
  const [sendingEmailFor, setSendingEmailFor] = useState<string | null>(null);

  const { data: requests } = useQuery({
    queryKey: ['admin-return-requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('return_requests')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as ReturnRequest[];
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin-return-requests'] });

  const updateStatus = async (req: ReturnRequest, status: ReturnRequestStatus) => {
    const { error } = await supabase.from('return_requests').update({ status }).eq('id', req.id);
    if (error) {
      toast.error('Failed to update status');
      return;
    }
    invalidate();

    // Notify the customer by email whenever their claim moves to
    // reviewing or resolved (not on the initial "new" state).
    setSendingEmailFor(req.id);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        toast.success('Status updated, but you\u2019ll need to log in again to notify the customer by email.');
        return;
      }

      const res = await fetch('/api/send-return-status-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: req.email,
          name: req.name,
          orderNumber: req.order_number,
          status,
        }),
      });
      const result = await res.json();

      if (!res.ok) {
        toast.error(`Status updated, but the email failed to send: ${result.error || 'unknown error'}`);
      } else {
        toast.success(`Status updated \u2014 ${req.name} has been emailed.`);
      }
    } catch (err) {
      toast.error('Status updated, but the notification email failed to send.');
    } finally {
      setSendingEmailFor(null);
    }
  };

  const deleteRequest = async (id: string) => {
    if (!confirm('Delete this claim? This cannot be undone.')) return;
    const { error } = await supabase.from('return_requests').delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete claim');
    } else {
      toast.success('Claim deleted');
      invalidate();
    }
  };

  const filtered = requests?.filter((r: ReturnRequest) => filter === 'all' || r.status === filter);

  return (
    <AdminShell>
      <h1 className="font-serif text-3xl font-medium text-zinc-100">Exchange &amp; Return Claims</h1>
      <p className="mt-1 text-sm text-zinc-500">Submissions from the Shipping &amp; Returns page</p>

      <div className="mt-6 flex gap-2">
        {(['all', 'new', 'reviewing', 'resolved'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
              filter === f
                ? 'bg-amber-500 text-zinc-950'
                : 'border border-zinc-700 text-zinc-400 hover:bg-zinc-800'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="mt-6 space-y-4">
        {filtered?.map((req: ReturnRequest) => (
          <div key={req.id} className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-serif text-lg font-medium text-zinc-100">{req.name}</h3>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[req.status]}`}>
                    {req.status}
                  </span>
                </div>
                <a href={`mailto:${req.email}`} className="mt-1 flex items-center gap-1.5 text-sm text-amber-400 hover:underline">
                  <Mail className="h-3.5 w-3.5" />
                  {req.email}
                </a>
                <p className="mt-1 text-xs text-zinc-500">
                  Order <span className="font-mono text-zinc-300">{req.order_number}</span> &middot; {formatDate(req.created_at)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <select
                  value={req.status}
                  onChange={(e) => updateStatus(req, e.target.value as ReturnRequestStatus)}
                  disabled={sendingEmailFor === req.id}
                  className="rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-amber-500 disabled:opacity-50"
                >
                  {req.status === 'new' && (
                    <option value="new" disabled hidden>
                      New
                    </option>
                  )}
                  <option value="reviewing">Reviewing</option>
                  <option value="resolved">Resolved</option>
                </select>
                <button
                  onClick={() => deleteRequest(req.id)}
                  title="Delete claim"
                  className="text-zinc-500 hover:text-red-400"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            <p className="mt-4 text-sm leading-relaxed text-zinc-300">{req.description}</p>

            {req.photo_urls?.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-3">
                {req.photo_urls.map((url: string, i: number) => (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                    <img
                      src={url}
                      alt={`Claim photo ${i + 1}`}
                      className="h-24 w-24 rounded-md border border-zinc-700 object-cover transition-opacity hover:opacity-80"
                    />
                  </a>
                ))}
              </div>
            )}
          </div>
        ))}

        {filtered?.length === 0 && (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-12 text-center">
            <PackageOpen className="mx-auto h-12 w-12 text-zinc-600" />
            <p className="mt-4 text-sm text-zinc-500">No claims here.</p>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
