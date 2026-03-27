import { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { PLAN_DISPLAY_NAMES } from '@covet/shared';
import clsx from 'clsx';

const navItems = [
  { label: 'Dashboard', icon: 'dashboard', path: '/dashboard', fill: true },
  { label: 'Add Product', icon: 'add_circle', path: '/dashboard/add' },
  { label: 'Billing', icon: 'credit_card', path: '/dashboard/billing' },
  { label: 'Settings', icon: 'settings', path: '/dashboard/settings' },
];

export function DashboardLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={clsx(
          'w-72 bg-white flex flex-col fixed h-full shadow-[1px_0_0_0_rgba(0,0,0,0.05)] z-40 transition-transform duration-300 lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="p-8 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="bg-brand-gold size-9 rounded-full flex items-center justify-center shadow-md shadow-brand-gold/20">
              <span className="material-symbols-outlined text-white !text-lg">sync_saved_locally</span>
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-text-main">Covet</h1>
              <p className="text-[10px] uppercase tracking-widest text-text-muted font-semibold">Concierge</p>
            </div>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1 text-text-muted hover:text-text-main"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <nav className="flex-1 px-6 space-y-2 mt-4">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path ||
              (item.path === '/dashboard' && location.pathname === '/dashboard');
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
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
            <p className="text-sm font-bold text-text-main mb-4">{user ? PLAN_DISPLAY_NAMES[user.plan] : 'Free'} Membership</p>
            <button
              onClick={logout}
              className="w-full bg-white border border-border-light text-text-muted text-[11px] font-bold py-2.5 rounded-xl hover:bg-blush-bg hover:text-blush-text hover:border-blush-text/20 transition-all"
            >
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-72 flex-1 min-w-0">
        {/* Top Bar */}
        <header className="h-16 lg:h-20 flex items-center justify-between px-4 lg:px-10 bg-cream/80 backdrop-blur-xl sticky top-0 z-10">
          {/* Mobile menu button */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 -ml-1 text-text-muted hover:text-text-main"
          >
            <span className="material-symbols-outlined">menu</span>
          </button>

          {/* Mobile logo */}
          <Link to="/" className="lg:hidden flex items-center gap-2">
            <div className="bg-brand-gold size-7 rounded-full flex items-center justify-center">
              <span className="material-symbols-outlined text-white !text-sm">sync_saved_locally</span>
            </div>
            <span className="text-sm font-bold text-text-main">Covet</span>
          </Link>

          {/* Desktop search */}
          <div className="hidden lg:flex items-center gap-4 flex-1 max-w-lg">
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

          <div className="flex items-center gap-3 lg:gap-6">
            <span className="hidden lg:flex items-center gap-2 text-brand-gold px-4 py-2 rounded-full text-[11px] font-bold uppercase tracking-wider bg-white shadow-soft border border-black/[0.02]">
              <span className="material-symbols-outlined !text-sm">verified</span>
              {user ? PLAN_DISPLAY_NAMES[user.plan] : 'Free'}
            </span>
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
