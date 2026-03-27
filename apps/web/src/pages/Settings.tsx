import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
import { getNotificationSettings, updateNotificationSettings } from '../api/settings';

export function Settings() {
  const { token, user } = useAuth();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['notificationSettings'],
    queryFn: () => getNotificationSettings(token!),
    enabled: !!token,
  });

  const [emailEnabled, setEmailEnabled] = useState<boolean | null>(null);
  const [emailAddress, setEmailAddress] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Use local state if user has edited, otherwise use server data
  const currentEmailEnabled = emailEnabled ?? settings?.emailEnabled ?? true;
  const currentEmailAddress = emailAddress ?? settings?.emailAddress ?? '';

  const mutation = useMutation({
    mutationFn: (updates: { emailEnabled?: boolean; emailAddress?: string | null }) =>
      updateNotificationSettings(token!, updates),
    onSuccess: (data) => {
      queryClient.setQueryData(['notificationSettings'], data);
      setEmailEnabled(null);
      setEmailAddress(null);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  const handleSave = () => {
    const updates: { emailEnabled?: boolean; emailAddress?: string | null } = {};

    if (emailEnabled !== null) {
      updates.emailEnabled = emailEnabled;
    }
    if (emailAddress !== null) {
      updates.emailAddress = emailAddress === '' ? null : emailAddress;
    }

    mutation.mutate(updates);
  };

  const hasChanges = emailEnabled !== null || emailAddress !== null;

  if (isLoading) {
    return (
      <div className="p-6 lg:p-10">
        <div className="animate-pulse space-y-6 max-w-2xl">
          <div className="h-8 w-48 bg-border-light rounded" />
          <div className="h-40 bg-border-light rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-10">
      <div className="max-w-2xl">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl font-light font-display text-text-main mb-2">Settings</h1>
          <p className="text-sm text-text-muted font-light">Manage your notification preferences.</p>
        </div>

        {/* Notification Settings */}
        <div className="bg-white rounded-2xl border border-border-light shadow-soft p-8">
          <div className="flex items-center gap-3 mb-8">
            <span className="material-symbols-outlined text-champagne-gold">notifications</span>
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-text-main">
              Email Notifications
            </h2>
          </div>

          {/* Email toggle */}
          <div className="flex items-center justify-between py-5 border-b border-border-light">
            <div>
              <p className="text-sm font-medium text-text-main">Email alerts</p>
              <p className="text-xs text-text-muted font-light mt-1">
                Receive emails for restocks, price drops, and price target hits.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setEmailEnabled(!currentEmailEnabled)}
              className={`relative w-12 h-6 rounded-full transition-colors border ${
                currentEmailEnabled
                  ? 'bg-champagne-gold/20 border-champagne-gold/50'
                  : 'bg-border-light border-border-light'
              }`}
            >
              <div
                className={`absolute top-[3px] w-[18px] h-[18px] rounded-full transition-all ${
                  currentEmailEnabled
                    ? 'left-[26px] bg-champagne-gold'
                    : 'left-[3px] bg-text-muted/30'
                }`}
              />
            </button>
          </div>

          {/* Email address override */}
          <div className="py-5">
            <label
              htmlFor="notifEmail"
              className="block text-sm font-medium text-text-main mb-1"
            >
              Notification email
            </label>
            <p className="text-xs text-text-muted font-light mb-3">
              Leave blank to use your account email ({user?.email}).
            </p>
            <input
              id="notifEmail"
              type="email"
              value={currentEmailAddress}
              onChange={(e) => setEmailAddress(e.target.value)}
              placeholder={user?.email || 'you@example.com'}
              className="w-full px-4 py-3 border border-border-light rounded-xl text-sm font-light focus:ring-2 focus:ring-brand-gold/10 focus:border-brand-gold/40 transition-all placeholder:text-stone-300"
            />
          </div>

          {/* Save */}
          <div className="flex items-center gap-4 pt-4">
            <button
              onClick={handleSave}
              disabled={!hasChanges || mutation.isPending}
              className="bg-text-main text-white px-8 py-3 text-[10px] uppercase tracking-[0.25em] font-medium hover:bg-black transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {mutation.isPending ? 'Saving...' : 'Save Changes'}
            </button>
            {saved && (
              <span className="text-xs text-green-600 font-medium flex items-center gap-1.5">
                <span className="material-symbols-outlined !text-sm">check_circle</span>
                Settings saved
              </span>
            )}
            {mutation.isError && (
              <span className="text-xs text-red-600 font-medium">
                Failed to save. Please try again.
              </span>
            )}
          </div>
        </div>

        {/* Alert Types Info */}
        <div className="mt-8 bg-cream rounded-2xl border border-border-light p-8">
          <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-text-muted mb-6">
            Alert Types
          </h3>
          <div className="space-y-4">
            {[
              {
                icon: 'inventory_2',
                title: 'Back in Stock',
                desc: 'When a tracked item returns to stock after being sold out.',
              },
              {
                icon: 'trending_down',
                title: 'Price Drop',
                desc: 'When an item\'s price decreases by 5% or more.',
              },
              {
                icon: 'flag',
                title: 'Price Target Hit',
                desc: 'When an item drops to or below your target price.',
              },
            ].map((alert) => (
              <div key={alert.title} className="flex items-start gap-3">
                <span className="material-symbols-outlined text-champagne-gold !text-lg mt-0.5">
                  {alert.icon}
                </span>
                <div>
                  <p className="text-sm font-medium text-text-main">{alert.title}</p>
                  <p className="text-xs text-text-muted font-light">{alert.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
