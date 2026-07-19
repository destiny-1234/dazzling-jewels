'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Tag, Trash2, Plus } from 'lucide-react';
import { supabase } from '@/lib/supabase/admin-client';
import { AdminShell } from '@/components/admin/admin-shell';
import { formatNaira, formatDate } from '@/lib/format';
import type { Coupon, CouponDiscountType } from '@/lib/types';

const emptyForm = {
  code: '',
  discount_type: 'percentage' as CouponDiscountType,
  discount_value: '',
  min_order_amount: '',
  usage_limit: '',
  expires_at: '',
};

export default function AdminCouponsPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const { data: coupons } = useQuery({
    queryKey: ['admin-coupons'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Coupon[];
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin-coupons'] });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.code.trim() || !form.discount_value) {
      toast.error('Code and discount value are required');
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('coupons').insert({
      code: form.code.trim().toUpperCase(),
      discount_type: form.discount_type,
      discount_value: Number(form.discount_value),
      min_order_amount: form.min_order_amount ? Number(form.min_order_amount) : 0,
      usage_limit: form.usage_limit ? Number(form.usage_limit) : null,
      expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message.includes('duplicate') ? 'That code already exists' : 'Failed to create coupon');
      return;
    }
    toast.success('Coupon created');
    setForm(emptyForm);
    setShowForm(false);
    invalidate();
  };

  const toggleActive = async (coupon: Coupon) => {
    const { error } = await supabase.from('coupons').update({ active: !coupon.active }).eq('id', coupon.id);
    if (error) {
      toast.error('Failed to update coupon');
    } else {
      invalidate();
    }
  };

  const deleteCoupon = async (id: string) => {
    if (!confirm('Delete this coupon? This cannot be undone.')) return;
    const { error } = await supabase.from('coupons').delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete coupon');
    } else {
      toast.success('Coupon deleted');
      invalidate();
    }
  };

  return (
    <AdminShell>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-medium text-zinc-100">Coupons</h1>
          <p className="mt-1 text-sm text-zinc-500">Discount codes customers can apply at checkout</p>
        </div>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="flex items-center gap-2 rounded-md bg-amber-500 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-amber-400"
        >
          <Plus className="h-4 w-4" />
          New Coupon
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="mt-6 grid gap-4 rounded-lg border border-zinc-800 bg-zinc-900 p-6 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-zinc-300">Code *</label>
            <input
              type="text"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              placeholder="e.g. WELCOME10"
              className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-500"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-zinc-300">Discount Type *</label>
            <select
              value={form.discount_type}
              onChange={(e) => setForm({ ...form, discount_type: e.target.value as CouponDiscountType })}
              className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-500"
            >
              <option value="percentage">Percentage (%)</option>
              <option value="fixed">Fixed Amount (₦)</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-zinc-300">
              Discount Value * {form.discount_type === 'percentage' ? '(%)' : '(₦)'}
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.discount_value}
              onChange={(e) => setForm({ ...form, discount_value: e.target.value })}
              placeholder={form.discount_type === 'percentage' ? 'e.g. 10' : 'e.g. 2000'}
              className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-500"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-zinc-300">Minimum Order Amount (₦)</label>
            <input
              type="number"
              min="0"
              value={form.min_order_amount}
              onChange={(e) => setForm({ ...form, min_order_amount: e.target.value })}
              placeholder="Optional"
              className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-500"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-zinc-300">Usage Limit</label>
            <input
              type="number"
              min="1"
              value={form.usage_limit}
              onChange={(e) => setForm({ ...form, usage_limit: e.target.value })}
              placeholder="Optional — unlimited if blank"
              className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-500"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-zinc-300">Expires On</label>
            <input
              type="date"
              value={form.expires_at}
              onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
              className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-500"
            />
          </div>
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-amber-500 px-6 py-2.5 text-sm font-medium text-zinc-950 hover:bg-amber-400 disabled:opacity-50"
            >
              {saving ? 'Creating...' : 'Create Coupon'}
            </button>
          </div>
        </form>
      )}

      <div className="mt-6 space-y-3">
        {coupons?.map((coupon: Coupon) => (
          <div key={coupon.id} className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-zinc-800 bg-zinc-900/50 p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10">
                <Tag className="h-4 w-4 text-amber-400" />
              </div>
              <div>
                <p className="font-mono text-sm font-medium text-zinc-100">{coupon.code}</p>
                <p className="text-xs text-zinc-500">
                  {coupon.discount_type === 'percentage' ? `${coupon.discount_value}% off` : `${formatNaira(coupon.discount_value)} off`}
                  {coupon.min_order_amount > 0 && ` · min ${formatNaira(coupon.min_order_amount)}`}
                  {' · '}
                  {coupon.times_used} used{coupon.usage_limit ? ` / ${coupon.usage_limit}` : ''}
                  {coupon.expires_at && ` · expires ${formatDate(coupon.expires_at)}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => toggleActive(coupon)}
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  coupon.active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-700 text-zinc-400'
                }`}
              >
                {coupon.active ? 'Active' : 'Inactive'}
              </button>
              <button onClick={() => deleteCoupon(coupon.id)} className="text-zinc-500 hover:text-red-400">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}

        {coupons?.length === 0 && (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-12 text-center">
            <Tag className="mx-auto h-12 w-12 text-zinc-600" />
            <p className="mt-4 text-sm text-zinc-500">No coupons yet. Create one to get started.</p>
          </div>
        )}
      </div>
    </AdminShell>
  );
}