'use client';

import { useQuery } from '@tanstack/react-query';
import { TrendingUp, ShoppingBag, Users, Wallet, TriangleAlert as AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase/admin-client';
import { AdminShell } from '@/components/admin/admin-shell';
import { formatNaira, formatDate } from '@/lib/format';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export default function AdminDashboardPage() {
  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const [ordersRes, customersRes, monthOrdersRes] = await Promise.all([
        supabase.from('orders').select('total, created_at, payment_status').eq('excluded_from_revenue', false),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('orders')
          .select('total, created_at')
          .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())
          .eq('payment_status', 'paid')
          .eq('excluded_from_revenue', false),
      ]);

      const allOrders = ordersRes.data || [];
      const paidOrders = allOrders.filter((o: any) => o.payment_status === 'paid');
      const totalRevenue = paidOrders.reduce((sum: number, o: any) => sum + Number(o.total), 0);
      const monthRevenue = (monthOrdersRes.data || []).reduce((sum: number, o: any) => sum + Number(o.total), 0);

      // 14-day revenue chart
      const days: { date: string; revenue: number }[] = [];
      for (let i = 13; i >= 0; i--) {
        const day = new Date();
        day.setDate(day.getDate() - i);
        const dayStr = day.toISOString().split('T')[0];
        const dayRevenue = paidOrders
          .filter((o: any) => o.created_at.startsWith(dayStr))
          .reduce((sum: number, o: any) => sum + Number(o.total), 0);
        days.push({ date: day.toLocaleDateString('en-NG', { month: 'short', day: 'numeric' }), revenue: dayRevenue });
      }

      return {
        totalRevenue,
        monthRevenue,
        totalOrders: allOrders.length,
        totalCustomers: customersRes.count || 0,
        chartData: days,
      };
    },
  });

  const { data: lowStock } = useQuery({
    queryKey: ['admin-low-stock'],
    queryFn: async () => {
      const { data } = await supabase
        .from('products')
        .select('id, name, stock, images')
        .lte('stock', 3)
        .order('stock', { ascending: true });
      return data || [];
    },
  });

  const statCards = [
    { label: 'Total Revenue', value: stats ? formatNaira(stats.totalRevenue) : '...', icon: Wallet, color: 'text-amber-400' },
    { label: "This Month's Revenue", value: stats ? formatNaira(stats.monthRevenue) : '...', icon: TrendingUp, color: 'text-green-400' },
    { label: 'Total Orders', value: stats?.totalOrders ?? '...', icon: ShoppingBag, color: 'text-blue-400' },
    { label: 'Total Customers', value: stats?.totalCustomers ?? '...', icon: Users, color: 'text-purple-400' },
  ];

  return (
    <AdminShell>
      <h1 className="font-serif text-3xl font-medium text-zinc-100">Dashboard</h1>
      <p className="mt-1 text-sm text-zinc-500">Overview of your store performance</p>

      {/* Stat cards */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <div key={card.label} className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-zinc-400">{card.label}</p>
              <card.icon className={`h-5 w-5 ${card.color}`} />
            </div>
            <p className="mt-3 font-serif text-2xl font-medium text-zinc-100">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Revenue chart */}
      <div className="mt-8 rounded-lg border border-zinc-800 bg-zinc-900 p-6">
        <h2 className="font-serif text-xl font-medium text-zinc-100">Revenue (Last 14 Days)</h2>
        <div className="mt-6 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={stats?.chartData || []}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="date" stroke="#71717a" fontSize={12} />
              <YAxis stroke="#71717a" fontSize={12} tickFormatter={(v) => `\u20A6${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }}
                labelStyle={{ color: '#71717a' }}
                formatter={(value: number) => [formatNaira(value), 'Revenue']}
              />
              <Area type="monotone" dataKey="revenue" stroke="#f59e0b" strokeWidth={2} fill="url(#revenueGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Low stock */}
      <div className="mt-8 rounded-lg border border-zinc-800 bg-zinc-900 p-6">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-400" />
          <h2 className="font-serif text-xl font-medium text-zinc-100">Low Stock Alert</h2>
        </div>
        <div className="mt-4 space-y-2">
          {lowStock && lowStock.length > 0 ? (
            lowStock.map((product: any) => (
              <div key={product.id} className="flex items-center justify-between rounded-md border border-zinc-800 bg-zinc-800/50 p-3">
                <div className="flex items-center gap-3">
                  {product.images?.[0] && (
                    <img src={product.images[0]} alt="" className="h-10 w-10 rounded object-cover" />
                  )}
                  <span className="text-sm text-zinc-200">{product.name}</span>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  product.stock === 0
                    ? 'bg-red-500/20 text-red-400'
                    : 'bg-amber-500/20 text-amber-400'
                }`}>
                  {product.stock === 0 ? 'Out of stock' : `${product.stock} left`}
                </span>
              </div>
            ))
          ) : (
            <p className="text-sm text-zinc-500">All products are well stocked.</p>
          )}
        </div>
      </div>
    </AdminShell>
  );
}
