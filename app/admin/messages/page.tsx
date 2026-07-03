'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Mail, CheckCheck, Trash2, Send, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '@/lib/supabase/admin-client';
import { AdminShell } from '@/components/admin/admin-shell';
import { formatDate } from '@/lib/format';
import type { ContactMessage } from '@/lib/types';

export default function AdminMessagesPage() {
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);

  const { data: messages } = useQuery({
    queryKey: ['admin-messages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contact_messages')
        .select('*, message_replies(*)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      // Keep each thread's replies in chronological order
      return (data as ContactMessage[]).map((m) => ({
        ...m,
        message_replies: (m.message_replies || []).sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        ),
      }));
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin-messages'] });

  const markRead = async (id: string) => {
    const { error } = await supabase.from('contact_messages').update({ read: true }).eq('id', id);
    if (error) {
      toast.error('Failed to mark as read');
    } else {
      toast.success('Marked as read');
      invalidate();
    }
  };

  const deleteMessage = async (id: string) => {
    if (!confirm('Delete this message and its whole reply thread? This cannot be undone.')) return;
    const { error } = await supabase.from('contact_messages').delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete message');
    } else {
      toast.success('Message deleted');
      if (expandedId === id) setExpandedId(null);
      invalidate();
    }
  };

  const toggleExpand = (msg: ContactMessage) => {
    setExpandedId(expandedId === msg.id ? null : msg.id);
    setReplyText('');
    if (!msg.read) markRead(msg.id);
  };

  const sendReply = async (msg: ContactMessage) => {
    const body = replyText.trim();
    if (!body) return;
    setSending(true);
    const { error } = await supabase.from('message_replies').insert({
      contact_message_id: msg.id,
      sender_type: 'admin',
      body,
    });
    setSending(false);
    if (error) {
      toast.error('Failed to send reply');
    } else {
      toast.success(
        msg.user_id
          ? 'Reply sent \u2014 the customer will see it in My Account \u2192 Messages.'
          : 'Reply saved. This sender wasn\u2019t signed in, so they won\u2019t see it in-app \u2014 consider emailing them too.'
      );
      setReplyText('');
      invalidate();
    }
  };

  return (
    <AdminShell>
      <h1 className="font-serif text-3xl font-medium text-zinc-100">Messages</h1>
      <p className="mt-1 text-sm text-zinc-500">Contact form submissions</p>

      <div className="mt-8 space-y-3">
        {messages?.map((msg: ContactMessage) => {
          const isExpanded = expandedId === msg.id;
          const replyCount = msg.message_replies?.length || 0;
          return (
            <div
              key={msg.id}
              className={`rounded-lg border p-6 ${
                !msg.read ? 'border-amber-500/40 bg-zinc-900' : 'border-zinc-800 bg-zinc-900/50'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h3 className="font-serif text-lg font-medium text-zinc-100">{msg.name}</h3>
                  <a href={`mailto:${msg.email}`} className="text-sm text-amber-400 hover:underline">{msg.email}</a>
                  {!msg.user_id && (
                    <span className="ml-2 text-xs text-zinc-600">(guest &mdash; not signed in)</span>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-xs text-zinc-500">{formatDate(msg.created_at)}</span>
                  {!msg.read && (
                    <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-xs font-medium text-amber-400">
                      New
                    </span>
                  )}
                  <button
                    onClick={() => deleteMessage(msg.id)}
                    title="Delete message"
                    className="text-zinc-500 hover:text-red-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <p className="mt-4 text-sm leading-relaxed text-zinc-300">{msg.message}</p>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                {!msg.read && (
                  <button
                    onClick={() => markRead(msg.id)}
                    className="flex items-center gap-2 rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800"
                  >
                    <CheckCheck className="h-3.5 w-3.5" />
                    Mark as read
                  </button>
                )}
                <button
                  onClick={() => toggleExpand(msg)}
                  className="flex items-center gap-2 rounded-md border border-amber-500/40 px-3 py-1.5 text-xs text-amber-400 hover:bg-amber-500/10"
                >
                  {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  {isExpanded ? 'Hide thread' : replyCount > 0 ? `Reply (${replyCount})` : 'Reply'}
                </button>
              </div>

              {isExpanded && (
                <div className="mt-5 space-y-3 border-t border-zinc-800 pt-5">
                  {msg.message_replies?.map((r) => (
                    <div
                      key={r.id}
                      className={`max-w-[85%] rounded-lg px-4 py-2.5 text-sm ${
                        r.sender_type === 'admin'
                          ? 'ml-auto bg-amber-500/15 text-amber-100'
                          : 'bg-zinc-800 text-zinc-200'
                      }`}
                    >
                      <p className="mb-1 text-[10px] uppercase tracking-wider text-zinc-500">
                        {r.sender_type === 'admin' ? 'You' : msg.name} &middot; {formatDate(r.created_at)}
                      </p>
                      {r.body}
                    </div>
                  ))}
                  {replyCount === 0 && (
                    <p className="text-xs text-zinc-600">No replies yet &mdash; start the conversation below.</p>
                  )}

                  <div className="flex items-start gap-2 pt-2">
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder={
                        msg.user_id
                          ? 'Write a reply the customer will see in My Account...'
                          : 'This sender is a guest \u2014 reply here or use their email above.'
                      }
                      className="min-h-[70px] flex-1 rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-500"
                    />
                    <button
                      onClick={() => sendReply(msg)}
                      disabled={sending || !replyText.trim()}
                      className="flex items-center gap-2 rounded-md bg-amber-500 px-4 py-2.5 text-sm font-medium text-zinc-950 hover:bg-amber-400 disabled:opacity-50"
                    >
                      <Send className="h-3.5 w-3.5" />
                      Send
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
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
