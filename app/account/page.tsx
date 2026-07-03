'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { Package, Heart, User as UserIcon, LogOut, Clock, MessageCircle, Send } from 'lucide-react';
import { SiteShell } from '@/components/site/site-shell';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase/client';
import { formatNaira, formatDate } from '@/lib/format';
import type { Order, WishlistItem, ContactMessage } from '@/lib/types';
import { useQuery, useQueryClient } from '@tanstack/react-query';

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800',
  shipped: 'bg-purple-100 text-purple-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  paid: 'bg-green-100 text-green-800',
  unpaid: 'bg-yellow-100 text-yellow-800',
  refunded: 'bg-red-100 text-red-800',
  approved: 'bg-green-100 text-green-800',
  pending_review: 'bg-yellow-100 text-yellow-800',
  rejected: 'bg-red-100 text-red-800',
};

export default function AccountPage() {
  const router = useRouter();
  const { user, profile, signOut, loading, refreshProfile } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'orders' | 'wishlist' | 'messages' | 'profile'>('orders');
  const [openThreadId, setOpenThreadId] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  // Profile form state
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // STRICT REDIRECT: Only boot out if loading has completely finished and there's no active user session
  useEffect(() => {
    if (!loading && !user) {
      router.replace('/auth');
    }
  }, [user, loading, router]);

  // Sync profile details safely when profile context attaches
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setPhone(profile.phone || '');
      setAddress(profile.address || '');
    }
  }, [profile]);

  // Fetch Orders - Only active if valid ID exists
  const { data: orders } = useQuery<Order[]>({
    queryKey: ['orders', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('user_id', user.id)
        .eq('hidden_from_customer', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Order[];
    },
    enabled: !!user?.id,
  });

  // Fetch Wishlist - Only active if valid ID exists
  const { data: wishlist } = useQuery<WishlistItem[]>({
    queryKey: ['wishlist', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('wishlist')
        .select('*, products(*)')
        .eq('user_id', user.id);

      if (error) throw error;
      return data as WishlistItem[];
    },
    enabled: !!user?.id,
  });

  // Fetch this customer's contact-form threads + replies
  const { data: messageThreads } = useQuery<ContactMessage[]>({
    queryKey: ['my-messages', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('contact_messages')
        .select('*, message_replies(*)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data as ContactMessage[]).map((m) => ({
        ...m,
        message_replies: (m.message_replies || []).sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        ),
      }));
    },
    enabled: !!user?.id,
  });

  const sendCustomerReply = async (thread: ContactMessage) => {
    const body = replyDraft.trim();
    if (!body) return;
    setSendingReply(true);
    const { error } = await supabase.from('message_replies').insert({
      contact_message_id: thread.id,
      sender_type: 'customer',
      body,
    });
    // Flag the thread unread again so the admin notices the follow-up
    await supabase.from('contact_messages').update({ read: false }).eq('id', thread.id);
    setSendingReply(false);
    if (error) {
      toast.error('Failed to send your reply');
    } else {
      setReplyDraft('');
      queryClient.invalidateQueries({ queryKey: ['my-messages', user?.id] });
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    
    setSavingProfile(true);
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName, phone, address })
      .eq('id', user.id);
      
    setSavingProfile(false);

    if (error) {
      toast.error('Failed to update profile');
    } else {
      toast.success('Profile updated');
      await refreshProfile();
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    }
  };

  // Guard: If authentication or initial profile parsing is running, freeze view cleanly
  if (loading || !user) {
    return (
      <SiteShell>
        <div className="container-luxe py-24 text-center text-muted-foreground animate-pulse">
          Securing session access...
        </div>
      </SiteShell>
    );
  }

  // Safe evaluations that fallback seamlessly if profile is resolving out-of-sync
  const firstName = profile?.full_name ? profile.full_name.split(' ')[0] : 'there';
  const isWholesalePending = profile?.account_type === 'wholesale' && profile?.account_status === 'pending';

  return (
    <SiteShell>
      <div className="container-luxe py-12">
        {/* Header */}
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="section-label">My Account</p>
            <h1 className="mt-2 font-serif text-4xl font-medium">Welcome, {firstName}</h1>
            {profile?.account_type === 'wholesale' && (
              <span className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-medium ${statusColors[profile.account_status === 'approved' ? 'approved' : 'pending_review'] || 'bg-gray-100 text-gray-800'}`}>
                Wholesale &middot; {profile.account_status}
              </span>
            )}
          </div>
          <button onClick={() => signOut()} className="btn-secondary-luxe">
            <LogOut className="mr-2 h-4 w-4" /> Sign Out
          </button>
        </div>

        {isWholesalePending && (
          <div className="card-luxe mt-6 flex items-center gap-3 border-l-4 border-accent p-4">
            <Clock className="h-5 w-5 text-accent" />
            <p className="text-sm">
              Your wholesale application is under review. You will be notified once it is approved and wholesale pricing is unlocked.
            </p>
          </div>
        )}

        {/* Tabs */}
        <div className="mt-8 flex border-b border-border">
          {[
            { key: 'orders', label: 'Orders', icon: Package },
            { key: 'wishlist', label: 'Wishlist', icon: Heart },
            { key: 'messages', label: 'Messages', icon: MessageCircle },
            { key: 'profile', label: 'Profile', icon: UserIcon },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key as any)}
              className={`relative flex items-center gap-2 px-4 pb-3 text-sm font-medium tracking-wide transition-colors ${
                tab === t.key ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'
              }`}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
              {t.key === 'messages' && messageThreads?.some((m: ContactMessage) => m.message_replies?.some((r) => r.sender_type === 'admin')) && (
                <span className="absolute -top-0.5 right-0 h-2 w-2 rounded-full bg-accent" />
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="mt-8">
          {tab === 'orders' && (
            <div>
              {orders && orders.length > 0 ? (
                <div className="space-y-4">
                  {orders.map((order: Order) => (
                    <div key={order.id} className="card-luxe p-6">
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                          <p className="font-mono text-sm text-muted-foreground">#{order.id.slice(0, 8).toUpperCase()}</p>
                          <p className="mt-1 text-sm text-muted-foreground">{formatDate(order.created_at)}</p>
                          <p className="mt-1 text-sm">{order.order_items?.length || 0} item(s)</p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <p className="font-serif text-lg font-medium">{formatNaira(order.total)}</p>
                          <div className="flex gap-2">
                            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[order.status] || ''}`}>
                              {order.status}
                            </span>
                            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[order.payment_status] || ''}`}>
                              {order.payment_status}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="card-luxe p-12 text-center">
                  <Package className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 font-serif text-xl font-light">No orders yet</h3>
                  <p className="mt-2 text-sm text-muted-foreground">When you place an order, it will appear here.</p>
                  <Link href="/shop" className="mt-6 inline-block btn-primary-luxe">Start Shopping</Link>
                </div>
              )}
            </div>
          )}

          {tab === 'wishlist' && (
            <div>
              {wishlist && wishlist.length > 0 ? (
                <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
                  {wishlist.map((item: WishlistItem) => (
                    <Link key={item.id} href={`/products/${item.products?.slug}`} className="group">
                      <div className="card-luxe transition-transform duration-300 group-hover:-translate-y-1">
                        <div className="aspect-[4/5] overflow-hidden bg-muted">
                          {item.products?.images?.[0] && (
                            <img src={item.products.images[0]} alt={item.products.name} className="h-full w-full object-cover" />
                          )}
                        </div>
                        <div className="p-4">
                          <h3 className="font-serif text-lg font-medium">{item.products?.name}</h3>
                          <p className="mt-1 text-sm font-medium text-primary">{formatNaira(item.products?.retail_price || 0)}</p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="card-luxe p-12 text-center">
                  <Heart className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 font-serif text-xl font-light">Your wishlist is empty</h3>
                  <p className="mt-2 text-sm text-muted-foreground">Save your favorite pieces for later.</p>
                  <Link href="/shop" className="mt-6 inline-block btn-primary-luxe">Browse Collection</Link>
                </div>
              )}
            </div>
          )}

          {tab === 'messages' && (
            <div>
              {messageThreads && messageThreads.length > 0 ? (
                <div className="space-y-4">
                  {messageThreads.map((thread: ContactMessage) => {
                    const isOpen = openThreadId === thread.id;
                    return (
                      <div key={thread.id} className="card-luxe p-6">
                        <button
                          onClick={() => {
                            setOpenThreadId(isOpen ? null : thread.id);
                            setReplyDraft('');
                          }}
                          className="flex w-full items-start justify-between gap-4 text-left"
                        >
                          <div>
                            <p className="text-sm text-muted-foreground">{formatDate(thread.created_at)}</p>
                            <p className="mt-1 text-sm">{thread.message}</p>
                          </div>
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {thread.message_replies?.length || 0} repl{thread.message_replies?.length === 1 ? 'y' : 'ies'}
                          </span>
                        </button>

                        {isOpen && (
                          <div className="mt-5 space-y-3 border-t border-border pt-5">
                            {thread.message_replies?.map((r) => (
                              <div
                                key={r.id}
                                className={`max-w-[85%] rounded-lg px-4 py-2.5 text-sm ${
                                  r.sender_type === 'customer'
                                    ? 'ml-auto bg-primary/10 text-foreground'
                                    : 'bg-muted text-foreground'
                                }`}
                              >
                                <p className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                                  {r.sender_type === 'admin' ? 'Fave Dazzling Jewels' : 'You'} &middot; {formatDate(r.created_at)}
                                </p>
                                {r.body}
                              </div>
                            ))}
                            {(!thread.message_replies || thread.message_replies.length === 0) && (
                              <p className="text-xs text-muted-foreground">No reply yet — we&apos;ll get back to you soon.</p>
                            )}
                            <div className="flex items-start gap-2 pt-2">
                              <textarea
                                value={replyDraft}
                                onChange={(e) => setReplyDraft(e.target.value)}
                                placeholder="Write a reply..."
                                className="input-luxe min-h-[70px] flex-1"
                              />
                              <button
                                onClick={() => sendCustomerReply(thread)}
                                disabled={sendingReply || !replyDraft.trim()}
                                className="btn-primary-luxe flex items-center gap-2 disabled:opacity-50"
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
                </div>
              ) : (
                <div className="card-luxe p-12 text-center">
                  <MessageCircle className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 font-serif text-xl font-light">No messages yet</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Messages you send from our Contact page while signed in will show up here, along with our replies.
                  </p>
                  <Link href="/contact" className="mt-6 inline-block btn-primary-luxe">Contact Us</Link>
                </div>
              )}
            </div>
          )}

          {tab === 'profile' && (
            <div className="card-luxe max-w-lg p-8">
              <h2 className="font-serif text-2xl font-medium">Profile Details</h2>
              <form onSubmit={handleSaveProfile} className="mt-6 space-y-4">
                <div>
                  <label className="text-sm font-medium">Full Name</label>
                  <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="input-luxe mt-1" />
                </div>
                <div>
                  <label className="text-sm font-medium">Email</label>
                  <input type="email" value={profile?.email || ''} disabled className="input-luxe mt-1 opacity-60" />
                </div>
                <div>
                  <label className="text-sm font-medium">Phone</label>
                  <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="input-luxe mt-1" placeholder="+234 ..." />
                </div>
                <div>
                  <label className="text-sm font-medium">Address</label>
                  <textarea value={address} onChange={(e) => setAddress(e.target.value)} className="input-luxe mt-1 min-h-[80px]" placeholder="Your delivery address" />
                </div>
                <button type="submit" disabled={savingProfile} className="btn-primary-luxe w-full disabled:opacity-50">
                  {savingProfile ? 'Saving...' : 'Save Changes'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </SiteShell>
  );
}
