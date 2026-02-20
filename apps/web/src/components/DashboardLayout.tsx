import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import clsx from 'clsx';

const navItems = [
  { label: 'Dashboard', icon: 'dashboard', path: '/dashboard', fill: true },
  { label: 'Add Product', icon: 'add_circle', path: '/dashboard/add' },
  { label: 'Notifications', icon: 'notifications', path: '/dashboard/notifications' },
  { label: 'Settings', icon: 'settings', path: '/dashboard/settings' },
];

export function DashboardLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-72 bg-white flex flex-col fixed h-full shadow-[1px_0_0_0_rgba(0,0,0,0.05)] z-20">
        <div className="p-8">
          <Link to="/" className="flex items-center gap-3">
            <div className="bg-brand-gold size-9 rounded-full flex items-center justify-center shadow-md shadow-brand-gold/20">
              <span className="material-symbols-outlined text-white !text-lg">sync_saved_locally</span>
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-text-main">Restocked.now</h1>
              <p className="text-[10px] uppercase tracking-widest text-text-muted font-semibold">Concierge</p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 px-6 space-y-2 mt-4">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path ||
              (item.path === '/dashboard' && location.pathname === '/dashboard');
            return (
              <Link
                key={item.path}
                to={item.path}
                className={clsx(
                  'flex items-center gap-3 px-4 py-3 rounded-xl transition-all group',
                  isActive
                    ? 'bg-cream text-brand-gold'
                    : 'text-text-muted hover:bg-cream hover:text-text-main'
                )}
              >
                <span className={clsx('material-symbols-outlined', isActive && item.fill && 'fill')}>
                  {item.icon}
                </span>
                <span className={clsx('text-sm', isActive ? 'font-semibold' : 'font-medium')}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="p-6 mt-auto">
          <div className="p-6 rounded-2xl bg-cream border border-black/5">
            <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1">Your Account</p>
            <p className="text-sm font-bold text-text-main mb-4 capitalize">{user?.plan ?? 'Free'} Membership</p>
            <button className="w-full bg-white border border-brand-gold/30 text-brand-gold text-[11px] font-bold py-2.5 rounded-xl hover:bg-brand-gold hover:text-white transition-all shadow-sm">
              View Upgrades
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-72 flex-1">
        {/* Top Bar */}
        <header className="h-20 flex items-center justify-between px-10 bg-cream/80 backdrop-blur-xl sticky top-0 z-10">
          <div className="flex items-center gap-4 flex-1 max-w-lg">
            <div className="relative w-full group">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-text-muted transition-colors group-focus-within:text-brand-gold">
                search
              </span>
              <input
                className="w-full bg-white border border-black/5 rounded-2xl pl-12 pr-4 py-2.5 text-sm focus:ring-1 focus:ring-brand-gold/20 focus:border-brand-gold/30 transition-all placeholder:text-text-muted/60"
                placeholder="Find a tracked item..."
                type="text"
              />
            </div>
          </div>
          <div className="flex items-center gap-6">
            <button className="flex items-center gap-2 text-brand-gold px-4 py-2 rounded-full text-[11px] font-bold uppercase tracking-wider bg-white shadow-soft hover:shadow-hover transition-all border border-black/[0.02]">
              <span className="material-symbols-outlined !text-sm">verified</span>
              Premium Support
            </button>
            <button className="relative p-2 text-text-muted hover:text-text-main transition-colors">
              <span className="material-symbols-outlined">notifications</span>
              <span className="absolute top-2 right-2 size-2 bg-blush-text rounded-full border-2 border-cream" />
            </button>
            <button
              onClick={logout}
              className="size-10 rounded-full bg-white overflow-hidden shadow-soft border border-white flex items-center justify-center text-text-muted hover:text-text-main transition-colors"
              title="Sign out"
            >
              <span className="material-symbols-outlined !text-xl">person</span>
            </button>
          </div>
        </header>

        <Outlet />
      </main>
    </div>
  );
}
