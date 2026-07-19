'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ChevronDown, ChevronUp, Trash2, RotateCcw, Eye, EyeOff, MinusCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase/admin-client';
import { AdminShell } from '@/components/admin/admin-shell';
import { formatNaira, formatDate } from '@/lib/format';
import type { Order, OrderStatus, PaymentStatus } from '@/lib/types';

export default function AdminOrdersPage() {
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showHidden, setShowHidden] = useState(false);
  const [quoteDrafts, setQuoteDrafts] = useState<Record<string, string>>({});

  const { data: orders } = useQuery({
    queryKey: ['admin-orders', showHidden],
    queryFn: async () => {
      let query = supabase
        .from('orders')
        .select('*, order_items(*), delivery_zones(name)')
        .order('created_at', { ascending: false });
      if (!showHidden) {
        query = query.eq('hidden_from_orders', false);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as Order[];
    },
  });

  const updateOrder = async (id: string, field: 'status' | 'payment_status', value: string) => {
    const { error } = await supabase.from('orders').update({ [field]: value }).eq('id', id);
    if (error) {
      toast.error('Failed to update order');
    } else {
      // If an admin manually marks an order as paid (e.g. confirmed bank
      // transfer), reduce stock the same way the automated checkout does.
      if (field === 'payment_status' && value === 'paid') {
        const { error: stockError } = await supabase.rpc('fulfill_order_stock', { p_order_id: id });
        if (stockError) {
          console.error('Failed to update stock for order', id, stockError);
        }
      }
      toast.success('Order updated');
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
    }
  };

  const setDeliveryFee = async (order: Order) => {
    const raw = quoteDrafts[order.id];
    const fee = Number(raw);
    if (raw === undefined || raw === '' || isNaN(fee) || fee < 0) {
      toast.error('Enter a valid delivery fee (0 or more)');
      return;
    }
    const { error } = await supabase
      .from('orders')
      .update({
        delivery_fee: fee,
        delivery_status: 'quoted',
        total: order.subtotal - (order.discount_amount || 0) + fee,
      })
      .eq('id', order.id);
    if (error) {
      toast.error('Failed to save delivery fee');
    } else {
      toast.success('Delivery fee set — the customer can now complete payment.');
      setQuoteDrafts((d) => {
        const next = { ...d };
        delete next[order.id];
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
    }
  };

  const deleteOrder = async (id: string) => {
    if (!confirm('Remove this order from your Orders list? It will still be counted in your Transactions and revenue — this only affects this list. You can find it again later with "Show hidden".')) return;
    const { error } = await supabase.from('orders').update({ hidden_from_orders: true }).eq('id', id);
    if (error) {
      toast.error('Failed to delete order');
    } else {
      toast.success('Order removed from list');
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
    }
  };

  const restoreOrder = async (id: string) => {
    const { error } = await supabase.from('orders').update({ hidden_from_orders: false }).eq('id', id);
    if (error) {
      toast.error('Failed to restore order');
    } else {
      toast.success('Order restored to list');
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
    }
  };

  // Full wipe: for a genuinely fake/mistake/test order (paid or not).
  // Hides it everywhere, including the customer's own order history, and
  // if it was paid, also removes it from revenue.
  const permanentlyDeleteOrder = async (id: string) => {
    if (!confirm('Permanently delete this order? This is for test/mistake orders only — it will disappear from all admin lists, from the customer\'s order history, and from revenue if it was paid. This cannot be undone.')) return;
    const { error } = await supabase
      .from('orders')
      .update({
        hidden_from_orders: true,
        hidden_from_transactions: true,
        excluded_from_revenue: true,
        hidden_from_customer: true,
      })
      .eq('id', id);
    if (error) {
      toast.error('Failed to permanently delete order');
    } else {
      toast.success('Order permanently deleted');
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      queryClient.invalidateQueries({ queryKey: ['admin-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['admin-transactions-revenue'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    }
  };

  const statusOptions: OrderStatus[] = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
  const paymentOptions: PaymentStatus[] = ['unpaid', 'paid', 'refunded'];

  return (
    <AdminShell>
      <h1 className="font-serif text-3xl font-medium text-zinc-100">Orders</h1>
      <p className="mt-1 text-sm text-zinc-500">Manage customer orders</p>

      <div className="mt-6 flex justify-end">
        <button
          onClick={() => setShowHidden((v) => !v)}
          className="flex items-center gap-2 rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-700"
        >
          {showHidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          {showHidden ? 'Hide removed orders' : 'Show removed orders'}
        </button>
      </div>

      <div className="mt-4 overflow-x-auto rounded-lg border border-zinc-800">
        <table className="w-full min-w-[640px]">
          <thead className="bg-zinc-900">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-400">Order ID</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-400">Customer</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-400">Total</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-400">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-400">Payment</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-400">Date</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-400">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800 bg-zinc-900/50">
            {orders?.map((order: Order) => (
              <>
                <tr key={order.id} className={`hover:bg-zinc-800/50 cursor-pointer ${order.hidden_from_orders ? 'opacity-50' : ''}`} onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}>
                  <td className="px-4 py-3 font-mono text-sm text-zinc-300">
                    #{order.id.slice(0, 8).toUpperCase()}
                    {order.hidden_from_orders && (
                      <span className="ml-2 rounded-full bg-zinc-700 px-2 py-0.5 text-[10px] uppercase tracking-wide text-zinc-300">Removed</span>
                    )}
                    {order.delivery_status === 'awaiting_quote' && (
                      <span className="ml-2 rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] uppercase tracking-wide text-amber-400">Needs Delivery Quote</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-300">{order.shipping_name || '-'}</td>
                  <td className="px-4 py-3 text-sm text-zinc-300">{formatNaira(order.total)}</td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <select
                      value={order.status}
                      onChange={(e) => updateOrder(order.id, 'status', e.target.value)}
                      className="rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                    >
                      {statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <select
                      value={order.payment_status}
                      onChange={(e) => updateOrder(order.id, 'payment_status', e.target.value)}
                      className="rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                    >
                      {paymentOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-400">{formatDate(order.created_at)}</td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setExpandedId(expandedId === order.id ? null : order.id)} className="text-zinc-400 hover:text-zinc-100">
                        {expandedId === order.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                      {order.hidden_from_orders ? (
                        <button onClick={() => restoreOrder(order.id)} className="text-zinc-400 hover:text-green-400" title="Restore to this list">
                          <RotateCcw className="h-4 w-4" />
                        </button>
                      ) : (
                        <button onClick={() => deleteOrder(order.id)} className="text-zinc-400 hover:text-red-400" title="Remove from this list only">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                      <button onClick={() => permanentlyDeleteOrder(order.id)} className="text-zinc-400 hover:text-red-500" title="Permanently delete (test/mistake orders only)">
                        <MinusCircle className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
                {expandedId === order.id && (
                  <tr className="bg-zinc-900">
                    <td colSpan={7} className="px-4 py-4">
                      <div className="space-y-2">
                        <p className="text-xs uppercase tracking-widest text-zinc-500">Order Items</p>
                        {order.order_items?.map((item: any) => (
                          <div key={item.id} className="flex items-center gap-4 rounded-md border border-zinc-800 p-3">
                            {item.image && <img src={item.image} alt="" className="h-12 w-10 rounded object-cover" />}
                            <div className="flex-1">
                              <p className="text-sm text-zinc-200">{item.product_name}</p>
                              <p className="text-xs text-zinc-500">Qty: {item.quantity} &middot; {formatNaira(item.unit_price)}</p>
                            </div>
                            <p className="text-sm text-zinc-300">{formatNaira(item.unit_price * item.quantity)}</p>
                          </div>
                        ))}
                        <div className="mt-3 rounded-md border border-zinc-800 p-3 text-sm text-zinc-400">
                          <p>Shipping: {order.shipping_name}, {order.shipping_address}, {order.shipping_phone}</p>
                          <p className="mt-1">
                            Delivery zone: {order.delivery_zones?.name || '—'} &middot; Subtotal: {formatNaira(order.subtotal)} &middot; Delivery fee: {order.delivery_status === 'awaiting_quote' ? 'Not set yet' : formatNaira(order.delivery_fee)}
                          </p>
                          {order.notes && <p className="mt-1">Notes: {order.notes}</p>}
                        </div>
                        {order.delivery_status === 'awaiting_quote' && (
                          <div className="mt-3 flex items-end gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 p-3">
                            <div className="flex-1">
                              <label className="mb-1 block text-xs uppercase tracking-wider text-amber-400">Set delivery fee (₦)</label>
                              <input
                                type="number"
                                min="0"
                                value={quoteDrafts[order.id] ?? ''}
                                onChange={(e) => setQuoteDrafts((d) => ({ ...d, [order.id]: e.target.value }))}
                                placeholder="e.g. 2500"
                                className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-500"
                              />
                            </div>
                            <button
                              onClick={() => setDeliveryFee(order)}
                              className="rounded-md bg-amber-500 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-amber-400"
                            >
                              Save Quote
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
