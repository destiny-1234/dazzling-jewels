'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase/admin-client';
import { AdminShell } from '@/components/admin/admin-shell';
import { formatNaira, formatDate } from '@/lib/format';
import type { Order, OrderStatus, PaymentStatus } from '@/lib/types';

export default function AdminOrdersPage() {
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: orders } = useQuery({
    queryKey: ['admin-orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('hidden_from_orders', false)
        .order('created_at', { ascending: false });
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

  const deleteOrder = async (id: string) => {
    if (!confirm('Remove this order from your Orders list? It will still be counted in your Transactions and revenue — this only affects this list.')) return;
    const { error } = await supabase.from('orders').update({ hidden_from_orders: true }).eq('id', id);
    if (error) {
      toast.error('Failed to delete order');
    } else {
      toast.success('Order removed from list');
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
    }
  };

  const statusOptions: OrderStatus[] = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
  const paymentOptions: PaymentStatus[] = ['unpaid', 'paid', 'refunded'];

  return (
    <AdminShell>
      <h1 className="font-serif text-3xl font-medium text-zinc-100">Orders</h1>
      <p className="mt-1 text-sm text-zinc-500">Manage customer orders</p>

      <div className="mt-8 overflow-x-auto rounded-lg border border-zinc-800">
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
                <tr key={order.id} className="hover:bg-zinc-800/50 cursor-pointer" onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}>
                  <td className="px-4 py-3 font-mono text-sm text-zinc-300">#{order.id.slice(0, 8).toUpperCase()}</td>
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
                      <button onClick={() => deleteOrder(order.id)} className="text-zinc-400 hover:text-red-400">
                        <Trash2 className="h-4 w-4" />
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
                          {order.notes && <p className="mt-1">Notes: {order.notes}</p>}
                        </div>
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
