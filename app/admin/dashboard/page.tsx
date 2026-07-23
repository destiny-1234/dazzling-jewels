'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, ShoppingBag, Users, Wallet, TriangleAlert as AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase/admin-client';
import { AdminShell } from '@/components/admin/admin-shell';
import { formatNaira, formatDate } from '@/lib/format';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
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

  const { data: analytics } = useQuery({
    queryKey: ['admin-analytics'],
    queryFn: async () => {
      const [itemsRes, ordersRes] = await Promise.all([
        supabase
          .from('order_items')
          .select('product_name, quantity, unit_price, orders!inner(payment_status)')
          .eq('orders.payment_status', 'paid'),
        supabase
          .from('orders')
          .select('status, total, user_id')
          .eq('payment_status', 'paid')
          .eq('excluded_from_revenue', false),
      ]);

      const userIds = Array.from(new Set((ordersRes.data || []).map((o: any) => o.user_id)));
      const { data: profileRows } = userIds.length
        ? await supabase.from('profiles').select('id, account_type').in('id', userIds)
        : { data: [] as any[] };
      const accountTypeMap = new Map((profileRows || []).map((p: any) => [p.id, p.account_type]));

      // Top products by revenue
      const productTotals = new Map<string, number>();
      for (const item of (itemsRes.data || []) as any[]) {
        const key = item.product_name;
        productTotals.set(key, (productTotals.get(key) || 0) + item.unit_price * item.quantity);
      }
      const topProducts = Array.from(productTotals.entries())
        .map(([name, revenue]) => ({ name: name.length > 18 ? name.slice(0, 18) + '…' : name, revenue }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 6);

      // Order status breakdown
      const statusCounts = new Map<string, number>();
      for (const order of (ordersRes.data || []) as any[]) {
        statusCounts.set(order.status, (statusCounts.get(order.status) || 0) + 1);
      }
      const statusBreakdown = Array.from(statusCounts.entries()).map(([name, value]) => ({ name, value }));

      // Retail vs wholesale revenue split
      let retailRevenue = 0;
      let wholesaleRevenue = 0;
      for (const order of (ordersRes.data || []) as any[]) {
        if (accountTypeMap.get(order.user_id) === 'wholesale') {
          wholesaleRevenue += Number(order.total);
        } else {
          retailRevenue += Number(order.total);
        }
      }
      const revenueSplit = [
        { name: 'Retail', value: retailRevenue },
        { name: 'Wholesale', value: wholesaleRevenue },
      ].filter((d) => d.value > 0);

      return { topProducts, statusBreakdown, revenueSplit };
    },
  });

  const STATUS_COLORS: Record<string, string> = {
    pending: '#eab308',
    processing: '#3b82f6',
    shipped: '#a855f7',
    delivered: '#22c55e',
    cancelled: '#ef4444',
  };
  const SPLIT_COLORS = ['#f59e0b', '#8b5cf6'];

  const statCards = [
    { label: 'Total Revenue', value: stats ? formatNaira(stats.totalRevenue) : '...', icon: Wallet, color: 'text-amber-400', href: '/admin/transactions' },
    { label: "This Month's Revenue", value: stats ? formatNaira(stats.monthRevenue) : '...', icon: TrendingUp, color: 'text-green-400', href: '/admin/transactions' },
    { label: 'Total Orders', value: stats?.totalOrders ?? '...', icon: ShoppingBag, color: 'text-blue-400', href: '/admin/orders' },
    { label: 'Total Customers', value: stats?.totalCustomers ?? '...', icon: Users, color: 'text-purple-400', href: '/admin/users' },
  ];

  return (
    <AdminShell>
      <h1 className="font-serif text-3xl font-medium text-zinc-100">Dashboard</h1>
      <p className="mt-1 text-sm text-zinc-500">Overview of your store performance</p>

      {/* Stat cards */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="rounded-lg border border-zinc-800 bg-zinc-900 p-6 transition-colors hover:border-zinc-600 hover:bg-zinc-800/70"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm text-zinc-400">{card.label}</p>
              <card.icon className={`h-5 w-5 ${card.color}`} />
            </div>
            <p className="mt-3 font-serif text-2xl font-medium text-zinc-100">{card.value}</p>
          </Link>
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

      {/* Top products + breakdowns */}
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="font-serif text-xl font-medium text-zinc-100">Top Products by Revenue</h2>
          <div className="mt-6 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics?.topProducts || []} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
                <XAxis type="number" stroke="#71717a" fontSize={11} tickFormatter={(v) => `\u20A6${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="name" stroke="#71717a" fontSize={11} width={110} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }}
                  labelStyle={{ color: '#e4e4e7' }}
                  formatter={(value: number) => [formatNaira(value), 'Revenue']}
                />
                <Bar dataKey="revenue" fill="#f59e0b" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
            {(!analytics?.topProducts || analytics.topProducts.length === 0) && (
              <p className="mt-4 text-center text-sm text-zinc-500">No paid orders yet.</p>
            )}
          </div>
        </div>

        <div className="grid gap-6">
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
            <h2 className="font-serif text-lg font-medium text-zinc-100">Order Status</h2>
            <div className="mt-4 h-40">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={analytics?.statusBreakdown || []} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60}>
                    {(analytics?.statusBreakdown || []).map((entry: { name: string; value: number }, i: number) => (
                      <Cell key={i} fill={STATUS_COLORS[entry.name] || '#71717a'} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }} />
                  <Legend wrapperStyle={{ fontSize: 11, color: '#a1a1aa' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
            <h2 className="font-serif text-lg font-medium text-zinc-100">Retail vs Wholesale Revenue</h2>
            <div className="mt-4 h-40">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={analytics?.revenueSplit || []} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60}>
                    {(analytics?.revenueSplit || []).map((entry: { name: string; value: number }, i: number) => (
                      <Cell key={i} fill={SPLIT_COLORS[i % SPLIT_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }}
                    formatter={(value: number) => formatNaira(value)}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, color: '#a1a1aa' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
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
