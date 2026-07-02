'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Download, Bell, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { AdminShell } from '@/components/admin/admin-shell';
import { formatDate } from '@/lib/format';
import type { NewsletterSubscriber } from '@/lib/types';

export default function AdminSubscribersPage() {
  const queryClient = useQueryClient();
  const [subject, setSubject] = useState('');
  const [messageBody, setMessageBody] = useState('');

  const { data: subscribers } = useQuery({
    queryKey: ['admin-subscribers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('newsletter_subscribers')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as NewsletterSubscriber[];
    },
  });

  const exportCSV = () => {
    if (!subscribers) return;
    const csv = ['Email,Date'].concat(
      subscribers.map((s: NewsletterSubscriber) => `${s.email},${s.created_at}`)
    ).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'subscribers.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported');
  };

  const deleteSubscriber = async (id: string) => {
    const { error } = await supabase.from('newsletter_subscribers').delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete subscriber');
    } else {
      toast.success('Subscriber removed');
      queryClient.invalidateQueries({ queryKey: ['admin-subscribers'] });
    }
  };

  const handleSendNewsletter = (e: React.FormEvent) => {
    e.preventDefault();
    // In production, integrate with an email service
    toast.success(`Newsletter queued to ${subscribers?.length || 0} subscribers (email service integration required)`);
    setSubject('');
    setMessageBody('');
  };

  return (
    <AdminShell>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-medium text-zinc-100">Subscribers</h1>
          <p className="mt-1 text-sm text-zinc-500">{subscribers?.length || 0} subscribers total</p>
        </div>
        <button
          onClick={exportCSV}
          className="flex items-center gap-2 rounded-md border border-zinc-700 px-4 py-2 text-sm text-zinc-300 transition-colors hover:bg-zinc-800"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_400px]">
        {/* Subscriber list */}
        <div className="overflow-hidden rounded-lg border border-zinc-800">
          <table className="w-full">
            <thead className="bg-zinc-900">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-400">Email</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-400">Date</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800 bg-zinc-900/50">
              {subscribers?.map((sub: NewsletterSubscriber) => (
                <tr key={sub.id} className="hover:bg-zinc-800/50">
                  <td className="px-4 py-3 text-sm text-zinc-300">{sub.email}</td>
                  <td className="px-4 py-3 text-sm text-zinc-400">{formatDate(sub.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end">
                      <button onClick={() => deleteSubscriber(sub.id)} className="text-zinc-400 hover:text-red-400">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {subscribers?.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-12 text-center text-sm text-zinc-500">No subscribers yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Send newsletter */}
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-amber-400" />
            <h2 className="font-serif text-xl font-medium text-zinc-100">Send Newsletter</h2>
          </div>
          <form onSubmit={handleSendNewsletter} className="mt-4 space-y-4">
            <div>
              <label className="text-sm font-medium text-zinc-300">Subject</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
                className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-500"
                placeholder="New Arrivals at Fave Dazzling Jewels"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-zinc-300">Message</label>
              <textarea
                value={messageBody}
                onChange={(e) => setMessageBody(e.target.value)}
                required
                className="mt-1 min-h-[140px] w-full rounded-md border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-500"
                placeholder="Write your newsletter content..."
              />
            </div>
            <button type="submit" className="w-full rounded-md bg-amber-500 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-amber-400">
              Send to {subscribers?.length || 0} Subscribers
            </button>
          </form>
        </div>
      </div>
    </AdminShell>
  );
}
