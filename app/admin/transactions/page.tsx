'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Trash2, MinusCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase/admin-client';
import { AdminShell } from '@/components/admin/admin-shell';
import { formatNaira, formatDate } from '@/lib/format';
import type { Order } from '@/lib/types';

export default function AdminTransactionsPage() {
  const queryClient = useQueryClient();

  // The visible list — respects hidden_from_transactions (a safe "remove
  // from this list" that does NOT touch revenue).
  const { data: transactions } = useQuery({
    queryKey: ['admin-transactions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('id, total, shipping_name, shipping_email, created_at, payment_reference, excluded_from_revenue')
        .eq('payment_status', 'paid')
        .eq('hidden_from_transactions', false)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Order[];
    },
  });

  // The true revenue total — intentionally ignores hidden_from_transactions
  // (a hidden-but-not-excluded transaction still counts), and only excludes
  // rows the admin has explicitly removed from revenue.
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

  const deleteTransaction = async (id: string) => {
    if (!confirm('Remove this transaction from your list? It will still be counted in your total revenue — this only affects this list.')) return;
    const { error } = await supabase.from('orders').update({ hidden_from_transactions: true }).eq('id', id);
    if (error) {
      toast.error('Failed to delete');
    } else {
      toast.success('Transaction removed from list');
      queryClient.invalidateQueries({ queryKey: ['admin-transactions'] });
    }
  };

  const removeFromRevenue = async (id: string, amount: number) => {
    if (!confirm(`Permanently remove ${formatNaira(amount)} from your total revenue? This cannot be undone, and will also remove it from this list.`)) return;
    const { error } = await supabase
      .from('orders')
      .update({ excluded_from_revenue: true, hidden_from_transactions: true })
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

      <div className="mt-8 overflow-x-auto rounded-lg border border-zinc-800">
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
              <tr key={tx.id} className="hover:bg-zinc-800/50">
                <td className="px-4 py-3 font-mono text-sm text-zinc-300">
                  {tx.payment_reference || tx.id.slice(0, 8).toUpperCase()}
                </td>
                <td className="px-4 py-3 text-sm text-zinc-300">{tx.shipping_name || tx.shipping_email || '-'}</td>
                <td className="px-4 py-3 text-sm font-medium text-amber-400">{formatNaira(tx.total)}</td>
                <td className="px-4 py-3 text-sm text-zinc-400">{formatDate(tx.created_at)}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => deleteTransaction(tx.id)}
                      className="text-zinc-400 hover:text-red-400"
                      title="Remove from this list only — keeps it in total revenue"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
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
