import { Link, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden">
      <nav className="sticky top-0 z-50 w-full border-b border-border-light bg-cream/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between px-8 py-6">
          <Link to="/" className="flex items-center gap-3">
            <span className="material-symbols-outlined text-champagne-gold text-2xl">auto_awesome</span>
            <h2 className="text-xl font-medium tracking-tight font-display">Restocked.now</h2>
          </Link>

          <div className="hidden md:flex items-center gap-12">
            <a href="#how-it-works" className="text-[10px] uppercase tracking-[0.2em] font-medium text-text-muted hover:text-champagne-gold transition-colors">
              Process
            </a>
            <a href="#features" className="text-[10px] uppercase tracking-[0.2em] font-medium text-text-muted hover:text-champagne-gold transition-colors">
              Curation
            </a>
            <a href="#pricing" className="text-[10px] uppercase tracking-[0.2em] font-medium text-text-muted hover:text-champagne-gold transition-colors">
              Services
            </a>
          </div>

          <div className="flex items-center gap-8">
            {user ? (
              <>
                <Link
                  to="/dashboard"
                  className="text-[10px] uppercase tracking-[0.15em] font-medium text-text-muted hover:text-text-main transition-colors"
                >
                  Dashboard
                </Link>
                <button
                  onClick={logout}
                  className="text-[10px] uppercase tracking-[0.15em] font-medium text-text-muted hover:text-text-main transition-colors"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="hidden sm:block text-[10px] uppercase tracking-[0.15em] font-medium text-text-muted hover:text-text-main transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="border border-border-light text-text-main hover:border-champagne-gold hover:text-champagne-gold transition-all px-8 py-2.5 text-[10px] uppercase tracking-[0.2em] font-medium rounded-full"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-border-light bg-white py-20">
        <div className="mx-auto max-w-[1280px] px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-12">
            <Link to="/" className="flex items-center gap-3">
              <span className="material-symbols-outlined text-champagne-gold">auto_awesome</span>
              <span className="text-lg font-display">Restocked.now</span>
            </Link>
            <div className="flex gap-12 text-[10px] uppercase tracking-[0.25em] font-medium text-text-muted">
              <a href="#" className="hover:text-champagne-gold transition-colors">Privacy</a>
              <a href="#" className="hover:text-champagne-gold transition-colors">Terms</a>
              <a href="#" className="hover:text-champagne-gold transition-colors">Concierge</a>
            </div>
            <div className="flex gap-8">
              <a href="#" className="text-text-muted hover:text-champagne-gold transition-colors">
                <span className="material-symbols-outlined text-xl">share</span>
              </a>
              <a href="#" className="text-text-muted hover:text-champagne-gold transition-colors">
                <span className="material-symbols-outlined text-xl">mail</span>
              </a>
            </div>
          </div>
          <div className="mt-20 pt-8 border-t border-cream text-center text-[10px] uppercase tracking-[0.25em] text-stone-300 font-light">
            &copy; 2025 Restocked.now Boutique Services. Not affiliated with Shopify Inc.
          </div>
        </div>
      </footer>
    </div>
  );
}
