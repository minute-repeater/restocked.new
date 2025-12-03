import { Link } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { Sparkles, X } from 'lucide-react';
import { useState } from 'react';

export function UpgradeBanner() {
  const { user } = useAuthStore();
  const [dismissed, setDismissed] = useState(false);

  // Only show for free users
  if (!user || user.plan !== 'free' || dismissed) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-primary/10 to-primary/5 border-b border-primary/20">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-semibold text-gray-900">
                Upgrade to Pro — Unlock unlimited tracking and real-time restock alerts
              </p>
              <p className="text-xs text-gray-600 mt-0.5">
                Track unlimited products, get instant notifications, and access advanced features
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/upgrade"
              className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary-dark transition-colors"
            >
              Upgrade Now
            </Link>
            <button
              onClick={() => setDismissed(true)}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

