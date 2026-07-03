'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Trash2, MinusCircle, RotateCcw, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/lib/supabase/admin-client';
import { AdminShell } from '@/components/admin/admin-shell';
import { formatNaira, formatDate } from '@/lib/format';
import type { Order } from '@/lib/types';

export default function AdminTransactionsPage() {
  const queryClient = useQueryClient();
  const [showHidden, setShowHidden] = useState(false);

  // The visible list. By default only shows rows still on this list
  // (hidden_from_transactions = false). Toggling "Show hidden" reveals
  // everything, including rows someone removed from this list earlier —
  // this is how you find a transaction again to permanently remove it
  // from revenue, or to restore it back onto this list.
  const { data: transactions } = useQuery({
    queryKey: ['admin-transactions', showHidden],
    queryFn: async () => {
      let query = supabase
        .from('orders')
        .select('id, total, shipping_name, shipping_email, created_at, payment_reference, hidden_from_transactions, excluded_from_revenue')
        .eq('payment_status', 'paid')
        .order('created_at', { ascending: false });
      if (!showHidden) {
        query = query.eq('hidden_from_transactions', false);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as Order[];
    },
  });

  // The true revenue total — always ignores hidden_from_transactions (a
  // hidden-but-not-excluded transaction still counts), and only excludes
  // rows the admin has explicitly, permanently removed from revenue.
  const { data: totalRevenue } = useQuery({
    queryKey: ['admin-transactions-revenue'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('total')
        .eq('payment_status', 'paid')
        .eq('excluded_from_revenue', false);
      if (error) throw error;
      return (data || []).reduce((sum: number, t: { total: number }) => sum + Number(t.total), 0);
    },
  });

  const hideTransaction = async (id: string) => {
    if (!confirm('Remove this transaction from your list? It will still be counted in your total revenue — this only affects this list. You can find it again later with "Show hidden".')) return;
    const { error } = await supabase.from('orders').update({ hidden_from_transactions: true }).eq('id', id);
    if (error) {
      toast.error('Failed to delete');
    } else {
      toast.success('Transaction removed from list');
      queryClient.invalidateQueries({ queryKey: ['admin-transactions'] });
    }
  };

  const restoreTransaction = async (id: string) => {
    const { error } = await supabase.from('orders').update({ hidden_from_transactions: false }).eq('id', id);
    if (error) {
      toast.error('Failed to restore');
    } else {
      toast.success('Transaction restored to list');
      queryClient.invalidateQueries({ queryKey: ['admin-transactions'] });
    }
  };

  const removeFromRevenue = async (id: string, amount: number) => {
    if (!confirm(`Permanently remove ${formatNaira(amount)} from your total revenue? This cannot be undone, will also remove it from this list, and it will no longer show in the customer's own order history.`)) return;
    const { error } = await supabase
      .from('orders')
      .update({ excluded_from_revenue: true, hidden_from_transactions: true, hidden_from_customer: true })
      .eq('id', id);
    if (error) {
      toast.error('Failed to update revenue');
    } else {
      toast.success('Removed from total revenue');
      queryClient.invalidateQueries({ queryKey: ['admin-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['admin-transactions-revenue'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    }
  };

  return (
    <AdminShell>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-medium text-zinc-100">Transactions</h1>
          <p className="mt-1 text-sm text-zinc-500">Financial ledger of paid orders</p>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 px-6 py-3">
          <p className="text-xs text-zinc-400">Total Processed</p>
          <p className="mt-1 font-serif text-xl font-medium text-amber-400">{formatNaira(totalRevenue || 0)}</p>
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          onClick={() => setShowHidden((v) => !v)}
          className="flex items-center gap-2 rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-700"
        >
          {showHidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          {showHidden ? 'Hide removed transactions' : 'Show removed transactions'}
        </button>
      </div>

      <div className="mt-4 overflow-x-auto rounded-lg border border-zinc-800">
        <table className="w-full min-w-[640px]">
          <thead className="bg-zinc-900">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-400">Reference</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-400">Customer</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-400">Amount</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-400">Date</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-400">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800 bg-zinc-900/50">
            {transactions?.map((tx: Order) => (
              <tr key={tx.id} className={`hover:bg-zinc-800/50 ${tx.hidden_from_transactions ? 'opacity-50' : ''}`}>
                <td className="px-4 py-3 font-mono text-sm text-zinc-300">
                  {tx.payment_reference || tx.id.slice(0, 8).toUpperCase()}
                  {tx.hidden_from_transactions && (
                    <span className="ml-2 rounded-full bg-zinc-700 px-2 py-0.5 text-[10px] uppercase tracking-wide text-zinc-300">Removed</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-zinc-300">{tx.shipping_name || tx.shipping_email || '-'}</td>
                <td className="px-4 py-3 text-sm font-medium text-amber-400">{formatNaira(tx.total)}</td>
                <td className="px-4 py-3 text-sm text-zinc-400">{formatDate(tx.created_at)}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-3">
                    {tx.hidden_from_transactions ? (
                      <button
                        onClick={() => restoreTransaction(tx.id)}
                        className="text-zinc-400 hover:text-green-400"
                        title="Restore to this list"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </button>
                    ) : (
                      <button
                        onClick={() => hideTransaction(tx.id)}
                        className="text-zinc-400 hover:text-red-400"
                        title="Remove from this list only — keeps it in total revenue"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={() => removeFromRevenue(tx.id, tx.total)}
                      className="text-zinc-400 hover:text-red-500"
                      title="Permanently remove from total revenue"
                    >
                      <MinusCircle className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {transactions?.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-sm text-zinc-500">No transactions yet</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
