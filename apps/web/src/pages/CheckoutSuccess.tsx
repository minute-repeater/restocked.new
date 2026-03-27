import { useEffect, useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getMe } from '../api/auth';
import { PLAN_DISPLAY_NAMES } from '@covet/shared';

export function CheckoutSuccess() {
  const { token, user, isLoading: authLoading, login } = useAuth();
  const [refreshing, setRefreshing] = useState(true);

  // Refetch user data to pick up the updated plan from the webhook
  useEffect(() => {
    if (!token) return;

    const refresh = async () => {
      try {
        const { user: updatedUser } = await getMe(token);
        login(token, updatedUser);
      } catch {
        // ignore — user data will be stale but not broken
      } finally {
        setRefreshing(false);
      }
    };

    // Small delay to give the webhook time to process
    const timer = setTimeout(refresh, 1500);
    return () => clearTimeout(timer);
  }, [token, login]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex items-center gap-3 text-text-muted">
          <span className="material-symbols-outlined animate-spin">progress_activity</span>
          <span className="text-sm font-light">Loading...</span>
        </div>
      </div>
    );
  }

  if (!token || !user) return <Navigate to="/login" replace />;

  const displayName = PLAN_DISPLAY_NAMES[user.plan];

  return (
    <div className="flex items-center justify-center min-h-[70vh] p-10">
      <div className="text-center max-w-md">
        {refreshing ? (
          <div className="flex flex-col items-center gap-4">
            <div className="size-16 rounded-full bg-brand-gold/10 flex items-center justify-center">
              <span className="material-symbols-outlined animate-spin text-brand-gold !text-3xl">progress_activity</span>
            </div>
            <p className="text-text-muted text-sm font-light">Activating your membership...</p>
          </div>
        ) : (
          <>
            <div className="size-20 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-8">
              <span className="material-symbols-outlined text-green-600 !text-4xl">check_circle</span>
            </div>
            <h2 className="text-3xl font-light font-display text-text-main mb-3">
              Welcome to <span className="font-bold">{displayName}</span>
            </h2>
            <p className="text-text-muted text-sm font-light mb-10 leading-relaxed">
              Your membership has been activated. You now have access to all {displayName} features
              and expanded tracking limits.
            </p>
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 bg-brand-gold text-white px-8 py-3.5 rounded-2xl font-bold text-sm shadow-lg shadow-brand-gold/20 hover:shadow-brand-gold/30 hover:-translate-y-0.5 transition-all"
            >
              <span className="material-symbols-outlined !text-lg">dashboard</span>
              Go to Dashboard
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
