'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Trash2, Eye, EyeOff, MapPin } from 'lucide-react';
import { supabase } from '@/lib/supabase/admin-client';
import { AdminShell } from '@/components/admin/admin-shell';
import { formatNaira } from '@/lib/format';
import type { DeliveryZone } from '@/lib/types';

export default function AdminDeliveryZonesPage() {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [fee, setFee] = useState('');
  const [needsQuote, setNeedsQuote] = useState(false);
  const [saving, setSaving] = useState(false);

  const { data: zones } = useQuery<DeliveryZone[]>({
    queryKey: ['admin-delivery-zones'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('delivery_zones')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });
      if (error) throw error;
      return data as DeliveryZone[];
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin-delivery-zones'] });

  const addZone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    const { error } = await supabase.from('delivery_zones').insert({
      name: name.trim(),
      fee: needsQuote ? null : Number(fee) || 0,
      is_active: true,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message.includes('duplicate') ? 'A zone with that name already exists' : 'Failed to add zone');
    } else {
      toast.success('Zone added');
      setName('');
      setFee('');
      setNeedsQuote(false);
      invalidate();
    }
  };

  const updateFee = async (zone: DeliveryZone, newFee: string) => {
    const value = newFee.trim() === '' ? null : Number(newFee);
    const { error } = await supabase.from('delivery_zones').update({ fee: value }).eq('id', zone.id);
    if (error) {
      toast.error('Failed to update fee');
    } else {
      invalidate();
    }
  };

  const toggleActive = async (zone: DeliveryZone) => {
    const { error } = await supabase
      .from('delivery_zones')
      .update({ is_active: !zone.is_active })
      .eq('id', zone.id);
    if (error) {
      toast.error('Failed to update zone');
    } else {
      invalidate();
    }
  };

  const deleteZone = async (zone: DeliveryZone) => {
    if (!confirm(`Delete "${zone.name}"? Orders already placed with this zone keep their fee — this only affects future checkouts.`)) return;
    const { error } = await supabase.from('delivery_zones').delete().eq('id', zone.id);
    if (error) {
      toast.error('Failed to delete zone');
    } else {
      toast.success('Zone deleted');
      invalidate();
    }
  };

  return (
    <AdminShell>
      <h1 className="font-serif text-3xl font-medium text-zinc-100">Delivery Zones</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Set a delivery fee per area. Leave the fee blank for zones you&apos;d rather quote by hand — those orders will wait for you in Orders before the customer can pay.
      </p>

      <form onSubmit={addZone} className="mt-8 rounded-lg border border-zinc-800 bg-zinc-900 p-6">
        <h2 className="mb-4 font-serif text-lg text-zinc-100">Add a Zone</h2>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="mb-1 block text-xs uppercase tracking-wider text-zinc-500">Zone name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Yaba, Ikeja, Abuja"
              className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-500"
            />
          </div>
          <div className="w-full sm:w-40">
            <label className="mb-1 block text-xs uppercase tracking-wider text-zinc-500">Fee (₦)</label>
            <input
              type="number"
              min="0"
              value={fee}
              onChange={(e) => setFee(e.target.value)}
              disabled={needsQuote}
              placeholder="0 = free"
              className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-500 disabled:opacity-40"
            />
          </div>
          <label className="flex items-center gap-2 pb-2 text-xs text-zinc-400 sm:pb-2.5">
            <input type="checkbox" checked={needsQuote} onChange={(e) => setNeedsQuote(e.target.checked)} />
            Quote by hand
          </label>
          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="flex items-center justify-center gap-2 rounded-md bg-amber-500 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-amber-400 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            Add Zone
          </button>
        </div>
      </form>

      <div className="mt-6 overflow-x-auto rounded-lg border border-zinc-800">
        <table className="w-full min-w-[560px]">
          <thead className="bg-zinc-900">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-400">Zone</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-400">Fee</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-400">Status</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-400">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800 bg-zinc-900/50">
            {zones?.map((zone: DeliveryZone) => (
              <tr key={zone.id} className={!zone.is_active ? 'opacity-50' : ''}>
                <td className="px-4 py-3 text-sm text-zinc-200">
                  <span className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-zinc-500" />
                    {zone.name}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <input
                    type="number"
                    min="0"
                    defaultValue={zone.fee ?? ''}
                    placeholder="Quote by hand"
                    onBlur={(e) => updateFee(zone, e.target.value)}
                    className="w-32 rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500"
                  />
                  {zone.fee !== null && (
                    <span className="ml-2 text-xs text-zinc-500">
                      {zone.fee === 0 ? '(free)' : formatNaira(zone.fee)}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm">
                  <span className={zone.is_active ? 'text-emerald-400' : 'text-zinc-500'}>
                    {zone.is_active ? 'Active' : 'Hidden'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-3">
                    <button onClick={() => toggleActive(zone)} className="text-zinc-400 hover:text-zinc-100" title={zone.is_active ? 'Hide from checkout' : 'Show at checkout'}>
                      {zone.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                    <button onClick={() => deleteZone(zone)} className="text-zinc-400 hover:text-red-400" title="Delete zone">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {zones?.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-sm text-zinc-500">No zones yet — add your first one above.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
