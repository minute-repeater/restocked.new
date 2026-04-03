import { useState } from 'react';
import { Link, Outlet, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import clsx from 'clsx';

const navItems = [
  { label: 'Overview', icon: 'analytics', path: '/admin' },
  { label: 'Users', icon: 'group', path: '/admin/users' },
  { label: 'Products', icon: 'inventory_2', path: '/admin/products' },
  { label: 'System Health', icon: 'monitor_heart', path: '/admin/health' },
];

export function AdminLayout() {
  const { user, token, isLoading, logout } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <div className="animate-pulse text-text-muted text-sm">Loading...</div>
      </div>
    );
  }

  if (!token || !user || !user.isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

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
          'w-72 bg-gray-900 flex flex-col fixed h-full z-40 transition-transform duration-300 lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="p-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-red-500 size-9 rounded-full flex items-center justify-center shadow-md">
              <span className="material-symbols-outlined text-white !text-lg">admin_panel_settings</span>
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-white">Covet</h1>
              <p className="text-[10px] uppercase tracking-widest text-red-400 font-bold">Admin</p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1 text-gray-400 hover:text-white"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <nav className="flex-1 px-6 space-y-2 mt-4">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={clsx(
                  'flex items-center gap-3 px-4 py-3 rounded-xl transition-all',
                  isActive
                    ? 'bg-white/10 text-white'
                    : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                )}
              >
                <span className="material-symbols-outlined">{item.icon}</span>
                <span className={clsx('text-sm', isActive ? 'font-semibold' : 'font-medium')}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="p-6 mt-auto space-y-3">
          <Link
            to="/dashboard"
            className="flex items-center gap-2 w-full text-gray-400 hover:text-white text-sm py-2.5 px-4 rounded-xl hover:bg-white/5 transition-all"
          >
            <span className="material-symbols-outlined !text-lg">arrow_back</span>
            Back to Dashboard
          </Link>
          <button
            onClick={logout}
            className="w-full bg-white/10 text-gray-300 text-[11px] font-bold py-2.5 rounded-xl hover:bg-white/20 transition-all"
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-72 flex-1 min-w-0 bg-gray-50">
        {/* Top Bar */}
        <header className="h-16 lg:h-20 flex items-center justify-between px-4 lg:px-10 bg-white border-b border-gray-200 sticky top-0 z-10">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 -ml-1 text-gray-500 hover:text-gray-900"
          >
            <span className="material-symbols-outlined">menu</span>
          </button>

          <div className="lg:hidden flex items-center gap-2">
            <div className="bg-red-500 size-7 rounded-full flex items-center justify-center">
              <span className="material-symbols-outlined text-white !text-sm">admin_panel_settings</span>
            </div>
            <span className="text-sm font-bold text-gray-900">Admin</span>
          </div>

          <div className="hidden lg:block" />

          <span className="flex items-center gap-2 text-red-600 px-4 py-2 rounded-full text-[11px] font-bold uppercase tracking-wider bg-red-50 border border-red-200">
            <span className="material-symbols-outlined !text-sm">shield</span>
            Admin
          </span>
        </header>

        <Outlet />
      </main>
    </div>
  );
}
