import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getTrackedItems, deleteTrackedItem } from '../api/tracking';
import { TrackedItemCard } from '../components/TrackedItemCard';
import { ItemDetailPanel } from '../components/ItemDetailPanel';
import { getPlanLimits } from '@covet/shared';

export function Dashboard() {
  const { token, user, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['trackedItems'],
    queryFn: () => getTrackedItems(token!),
    enabled: !!token,
    refetchInterval: 60000,
  });

  const deleteMutation = useMutation({
    mutationFn: (itemId: string) => deleteTrackedItem(token!, itemId),
    onMutate: (itemId) => {
      setDeletingId(itemId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trackedItems'] });
    },
    onSettled: () => {
      setDeletingId(null);
    },
  });

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

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  const items = data?.items ?? [];
  const limits = getPlanLimits(user.plan);

  // Calculate stats
  const inStockCount = items.filter((i) => i.latestCheck?.inStock === true).length;
  const priceDropCount = items.filter(
    (i) => i.targetPrice && i.latestCheck?.price && i.latestCheck.price <= i.targetPrice
  ).length;

  return (
    <div className="p-10 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-4xl font-light text-text-main tracking-tight font-display">
            Tracked <span className="font-bold">Inventory</span>
          </h2>
          <p className="text-text-muted mt-2 text-sm">
            Monitoring your curated selection across luxury and retail platforms.
          </p>
        </div>
        <Link
          to="/dashboard/add"
          className="bg-brand-gold text-white px-7 py-3 rounded-2xl font-bold text-sm flex items-center gap-2 shadow-lg shadow-brand-gold/20 hover:shadow-brand-gold/30 hover:-translate-y-0.5 transition-all"
        >
          <span className="material-symbols-outlined">add</span>
          Track New Item
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
        <div className="bg-white p-7 rounded-3xl shadow-soft flex flex-col gap-2">
          <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Active Monitors</p>
          <div className="flex items-end justify-between">
            <span className="text-4xl font-light">{String(items.length).padStart(2, '0')}</span>
            <span className="text-text-muted text-[11px] font-medium mb-1">
              of {limits.maxTrackedItems}
            </span>
          </div>
        </div>
        <div className="bg-white p-7 rounded-3xl shadow-soft flex flex-col gap-2">
          <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Currently In Stock</p>
          <div className="flex items-end justify-between">
            <span className="text-4xl font-light text-brand-gold">{String(inStockCount).padStart(2, '0')}</span>
            <span className="text-text-muted text-[11px] font-medium mb-1">Items available</span>
          </div>
        </div>
        <div className="bg-white p-7 rounded-3xl shadow-soft flex flex-col gap-2">
          <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Price Adjustments</p>
          <div className="flex items-end justify-between">
            <span className="text-4xl font-light">{String(priceDropCount).padStart(2, '0')}</span>
            <span className="text-text-muted text-[11px] font-medium mb-1">Drops detected</span>
          </div>
        </div>
      </div>

      {/* Product Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-32">
          <div className="flex items-center gap-3 text-text-muted">
            <span className="material-symbols-outlined animate-spin">progress_activity</span>
            <span className="text-sm font-light">Loading your collection...</span>
          </div>
        </div>
      ) : error ? (
        <div className="text-center py-32">
          <span className="material-symbols-outlined text-blush-text !text-4xl mb-4">error</span>
          <p className="text-text-main font-medium mb-2">Failed to load products</p>
          <button
            onClick={() => refetch()}
            className="text-brand-gold hover:underline text-sm font-medium"
          >
            Try again
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {items.map((item) => (
            <TrackedItemCard
              key={item.id}
              item={item}
              onDelete={() => deleteMutation.mutate(item.id)}
              isDeleting={deletingId === item.id}
              onClick={() => setSelectedItemId(item.id)}
            />
          ))}

          {/* Add New Card */}
          {items.length < limits.maxTrackedItems && (
            <Link
              to="/dashboard/add"
              className="bg-white/40 border-2 border-dashed border-brand-gold/20 rounded-3xl flex flex-col items-center justify-center p-8 hover:bg-white/80 hover:border-brand-gold/40 transition-all cursor-pointer group min-h-[300px]"
            >
              <div className="size-14 rounded-2xl bg-white shadow-soft flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-brand-gold !text-3xl">add</span>
              </div>
              <p className="font-bold text-text-main text-sm">Expand Collection</p>
              <p className="text-[11px] text-text-muted text-center mt-3 px-4 leading-relaxed tracking-wide">
                Enter a product URL to initiate real-time surveillance.
              </p>
            </Link>
          )}

          {/* Plan limit card */}
          {items.length >= limits.maxTrackedItems && (
            <div className="bg-cream border-2 border-dashed border-brand-gold/30 rounded-3xl flex flex-col items-center justify-center p-8 min-h-[300px]">
              <div className="size-14 rounded-2xl bg-white shadow-soft flex items-center justify-center mb-6">
                <span className="material-symbols-outlined text-brand-gold !text-3xl">lock</span>
              </div>
              <p className="font-bold text-text-main text-sm">Plan Limit Reached</p>
              <p className="text-[11px] text-text-muted text-center mt-3 px-4 leading-relaxed tracking-wide">
                Upgrade your membership to track more items.
              </p>
              <Link
                to="/dashboard/billing"
                className="mt-6 bg-white border border-brand-gold/30 text-brand-gold text-[10px] font-bold uppercase tracking-widest px-6 py-2.5 rounded-xl hover:bg-brand-gold hover:text-white transition-all"
              >
                View Upgrades
              </Link>
            </div>
          )}
        </div>
      )}
      {/* Detail Panel */}
      {selectedItemId && (
        <ItemDetailPanel
          itemId={selectedItemId}
          onClose={() => setSelectedItemId(null)}
        />
      )}
    </div>
  );
}
