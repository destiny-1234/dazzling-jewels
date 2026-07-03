'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Mail, CheckCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase/admin-client';
import { AdminShell } from '@/components/admin/admin-shell';
import { formatDate } from '@/lib/format';
import type { ContactMessage } from '@/lib/types';

export default function AdminMessagesPage() {
  const queryClient = useQueryClient();

  const { data: messages } = useQuery({
    queryKey: ['admin-messages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contact_messages')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as ContactMessage[];
    },
  });

  const markRead = async (id: string) => {
    const { error } = await supabase.from('contact_messages').update({ read: true }).eq('id', id);
    if (error) {
      toast.error('Failed to mark as read');
    } else {
      toast.success('Marked as read');
      queryClient.invalidateQueries({ queryKey: ['admin-messages'] });
    }
  };

  return (
    <AdminShell>
      <h1 className="font-serif text-3xl font-medium text-zinc-100">Messages</h1>
      <p className="mt-1 text-sm text-zinc-500">Contact form submissions</p>

      <div className="mt-8 space-y-3">
        {messages?.map((msg: ContactMessage) => (
          <div
            key={msg.id}
            className={`rounded-lg border p-6 ${
              !msg.read ? 'border-amber-500/40 bg-zinc-900' : 'border-zinc-800 bg-zinc-900/50'
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-serif text-lg font-medium text-zinc-100">{msg.name}</h3>
                <a href={`mailto:${msg.email}`} className="text-sm text-amber-400 hover:underline">{msg.email}</a>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-zinc-500">{formatDate(msg.created_at)}</span>
                {!msg.read && (
                  <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-xs font-medium text-amber-400">
                    New
                  </span>
                )}
              </div>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-zinc-300">{msg.message}</p>
            {!msg.read && (
              <button
                onClick={() => markRead(msg.id)}
                className="mt-4 flex items-center gap-2 rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark as read
              </button>
            )}
          </div>
        ))}
        {messages?.length === 0 && (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-12 text-center">
            <Mail className="mx-auto h-12 w-12 text-zinc-600" />
            <p className="mt-4 text-sm text-zinc-500">No messages yet.</p>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
