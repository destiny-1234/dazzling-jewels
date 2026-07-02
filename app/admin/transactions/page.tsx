'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { AdminShell } from '@/components/admin/admin-shell';
import { formatNaira, formatDate } from '@/lib/format';
import type { Order } from '@/lib/types';

export default function AdminTransactionsPage() {
  const queryClient = useQueryClient();

  const { data: transactions } = useQuery({
    queryKey: ['admin-transactions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('id, total, shipping_name, shipping_email, created_at, payment_reference')
        .eq('payment_status', 'paid')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Order[];
    },
  });

  const deleteTransaction = async (id: string) => {
    if (!confirm('Delete this transaction record?')) return;
    const { error } = await supabase.from('orders').delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete');
    } else {
      toast.success('Transaction deleted');
      queryClient.invalidateQueries({ queryKey: ['admin-transactions'] });
    }
  };

  const totalRevenue = (transactions || []).reduce((sum: number, t: Order) => sum + Number(t.total), 0);

  return (
    <AdminShell>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-medium text-zinc-100">Transactions</h1>
          <p className="mt-1 text-sm text-zinc-500">Financial ledger of paid orders</p>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 px-6 py-3">
          <p className="text-xs text-zinc-400">Total Processed</p>
          <p className="mt-1 font-serif text-xl font-medium text-amber-400">{formatNaira(totalRevenue)}</p>
        </div>
      </div>

      <div className="mt-8 overflow-hidden rounded-lg border border-zinc-800">
        <table className="w-full">
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
                  <div className="flex justify-end">
                    <button onClick={() => deleteTransaction(tx.id)} className="text-zinc-400 hover:text-red-400">
                      <Trash2 className="h-4 w-4" />
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
