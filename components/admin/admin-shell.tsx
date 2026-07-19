'use client';

import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  CreditCard,
  Users,
  Store,
  Mail,
  Bell,
  Settings,
  LogOut,
  Menu,
  X,
  MapPin,
  PackageOpen,
  Tag,
  Star,
} from 'lucide-react';
import { useAdminAuth } from '@/lib/admin-auth-context';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/products', label: 'Products', icon: Package },
  { href: '/admin/orders', label: 'Orders', icon: ShoppingBag },
  { href: '/admin/returns', label: 'Returns', icon: PackageOpen },
  { href: '/admin/delivery-zones', label: 'Delivery Zones', icon: MapPin },
 { href: '/admin/coupons', label: 'Coupons', icon: Tag },
  { href: '/admin/reviews', label: 'Reviews', icon: Star },
  { href: '/admin/transactions', label: 'Transactions', icon: CreditCard },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/wholesale', label: 'Wholesale Queue', icon: Store },
  { href: '/admin/messages', label: 'Messages', icon: Mail },
  { href: '/admin/subscribers', label: 'Subscribers', icon: Bell },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut, loading, isAdmin } = useAdminAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-400">
        Loading...
      </div>
    );
  }

  if (!isAdmin) {
    router.push('/admin/login');
    return null;
  }

  const handleSignOut = async () => {
    await signOut();
    router.push('/admin/login');
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Sidebar - desktop */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-zinc-800 bg-zinc-900 lg:flex">
        <div className="flex h-16 items-center gap-2 border-b border-zinc-800 px-6">
          <ShieldIcon />
          <span className="font-serif text-lg font-medium text-amber-400">Fave Admin</span>
        </div>
        <nav className="flex-1 space-y-1 p-4">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                pathname === item.href
                  ? 'bg-amber-500/10 text-amber-400'
                  : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-zinc-800 p-4">
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-64 flex-col border-r border-zinc-800 bg-zinc-900">
            <div className="flex h-16 items-center justify-between border-b border-zinc-800 px-6">
              <div className="flex items-center gap-2">
                <ShieldIcon />
                <span className="font-serif text-lg font-medium text-amber-400">Fave Admin</span>
              </div>
              <button onClick={() => setSidebarOpen(false)}>
                <X className="h-5 w-5 text-zinc-400" />
              </button>
            </div>
            <nav className="flex-1 space-y-1 p-4">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                    pathname === item.href
                      ? 'bg-amber-500/10 text-amber-400'
                      : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="border-t border-zinc-800 p-4">
              <button
                onClick={handleSignOut}
                className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-zinc-400 hover:bg-zinc-800"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Mobile header */}
        <header className="flex h-16 items-center justify-between border-b border-zinc-800 bg-zinc-900 px-4 lg:hidden">
          <button onClick={() => setSidebarOpen(true)}>
            <Menu className="h-6 w-6 text-zinc-400" />
          </button>
          <span className="font-serif text-lg font-medium text-amber-400">Fave Admin</span>
          <div className="w-6" />
        </header>

        <main className="p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

function ShieldIcon() {
  return (
    <svg className="h-6 w-6 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2L4 6v6c0 5.5 3.5 10 8 11 4.5-1 8-5.5 8-11V6l-8-4z" />
    </svg>
  );
}
