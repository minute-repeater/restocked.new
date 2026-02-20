import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTrackedItemDetail, updateTrackedItem, deleteTrackedItem } from '../api/tracking';
import { useAuth } from '../hooks/useAuth';
import clsx from 'clsx';

interface ItemDetailPanelProps {
  itemId: string;
  onClose: () => void;
}

export function ItemDetailPanel({ itemId, onClose }: ItemDetailPanelProps) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [isVisible, setIsVisible] = useState(false);
  const [editingPrice, setEditingPrice] = useState(false);
  const [priceInput, setPriceInput] = useState('');

  // Slide in on mount
  useEffect(() => {
    requestAnimationFrame(() => setIsVisible(true));
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300);
  };

  const { data, isLoading } = useQuery({
    queryKey: ['trackedItem', itemId],
    queryFn: () => getTrackedItemDetail(token!, itemId),
    enabled: !!token,
  });

  const updateMutation = useMutation({
    mutationFn: (updates: { targetPrice?: number | null; isActive?: boolean }) =>
      updateTrackedItem(token!, itemId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trackedItem', itemId] });
      queryClient.invalidateQueries({ queryKey: ['trackedItems'] });
      setEditingPrice(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteTrackedItem(token!, itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trackedItems'] });
      handleClose();
    },
  });

  const item = data?.item;
  const stockHistory = data?.stockHistory ?? [];
  const notifications = data?.notifications ?? [];

  const formatPrice = (cents: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);

  const formatDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatTime = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  // Compute restock frequency from stock history
  const restockEstimate = useMemo(() => {
    if (stockHistory.length < 4) return null;
    const restockEvents: Date[] = [];
    for (let i = 1; i < stockHistory.length; i++) {
      const prev = stockHistory[i]; // older (DESC order)
      const curr = stockHistory[i - 1]; // newer
      if (!prev.inStock && curr.inStock) {
        restockEvents.push(new Date(typeof curr.checkedAt === 'string' ? curr.checkedAt : curr.checkedAt));
      }
    }
    if (restockEvents.length < 2) return null;
    const gaps: number[] = [];
    for (let i = 1; i < restockEvents.length; i++) {
      gaps.push(Math.abs(restockEvents[i].getTime() - restockEvents[i - 1].getTime()));
    }
    const avgMs = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    const avgDays = Math.round(avgMs / (1000 * 60 * 60 * 24));
    if (avgDays < 1) return 'Multiple times daily';
    if (avgDays === 1) return 'About once per day';
    if (avgDays <= 7) return `Every ~${avgDays} days`;
    if (avgDays <= 30) return `Every ~${Math.round(avgDays / 7)} weeks`;
    return `Every ~${Math.round(avgDays / 30)} months`;
  }, [stockHistory]);

  const handleSavePrice = () => {
    const val = priceInput.trim();
    if (val === '') {
      updateMutation.mutate({ targetPrice: null });
    } else {
      const cents = Math.round(parseFloat(val) * 100);
      if (!isNaN(cents) && cents >= 0) {
        updateMutation.mutate({ targetPrice: cents });
      }
    }
  };

  const handleToggleActive = () => {
    if (!item) return;
    updateMutation.mutate({ isActive: !item.isActive });
  };

  const startEditPrice = () => {
    setEditingPrice(true);
    setPriceInput(item?.targetPrice ? (item.targetPrice / 100).toFixed(2) : '');
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={clsx(
          'fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity duration-300',
          isVisible ? 'opacity-100' : 'opacity-0'
        )}
        onClick={handleClose}
      />

      {/* Panel */}
      <div
        className={clsx(
          'fixed top-0 right-0 h-full w-full max-w-[520px] bg-cream z-50 shadow-2xl transition-transform duration-300 ease-out flex flex-col',
          isVisible ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-6 right-6 z-10 size-10 rounded-full bg-white shadow-soft flex items-center justify-center text-text-muted hover:text-text-main transition-colors"
        >
          <span className="material-symbols-outlined">close</span>
        </button>

        {isLoading || !item ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex items-center gap-3 text-text-muted">
              <span className="material-symbols-outlined animate-spin">progress_activity</span>
              <span className="text-sm font-light">Loading details...</span>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {/* Product Header */}
            <div className="p-8 pb-0">
              <div className="flex gap-6">
                {/* Image */}
                <div className="w-28 h-36 rounded-2xl overflow-hidden bg-white shadow-soft flex-shrink-0">
                  {item.product.imageUrl ? (
                    <img
                      src={item.product.imageUrl}
                      alt={item.product.name ?? 'Product'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-text-muted">
                      <span className="material-symbols-outlined !text-3xl">image</span>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 pt-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={clsx(
                        'text-[9px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider',
                        item.latestCheck?.inStock
                          ? 'bg-sage-bg text-sage-text'
                          : 'bg-blush-bg text-blush-text'
                      )}
                    >
                      {item.latestCheck?.inStock ? 'In Stock' : 'Out of Stock'}
                    </span>
                    {!item.isActive && (
                      <span className="text-[9px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider bg-stone-100 text-stone-400">
                        Paused
                      </span>
                    )}
                  </div>
                  <h2 className="font-display text-xl text-text-main leading-snug mb-1 line-clamp-2">
                    {item.product.name || 'Unknown Product'}
                  </h2>
                  <p className="text-[11px] text-text-muted uppercase tracking-widest font-medium">
                    {item.product.retailer || 'Unknown Retailer'}
                  </p>
                  {item.variant && (
                    <p className="text-xs text-text-muted mt-1">
                      Variant: <span className="font-medium text-text-main">{item.variant.name}</span>
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Price Section */}
            <div className="px-8 py-6">
              <div className="bg-white rounded-2xl p-6 shadow-soft">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1">Current Price</p>
                    <p className="text-3xl font-light text-text-main">
                      {item.latestCheck?.price ? formatPrice(item.latestCheck.price) : '—'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1">Target Price</p>
                    {editingPrice ? (
                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-text-muted">$</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={priceInput}
                            onChange={(e) => setPriceInput(e.target.value)}
                            className="w-24 border border-border-light rounded-lg pl-6 pr-2 py-1.5 text-sm text-right focus:ring-2 focus:ring-brand-gold/10 focus:border-brand-gold/40"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSavePrice();
                              if (e.key === 'Escape') setEditingPrice(false);
                            }}
                          />
                        </div>
                        <button
                          onClick={handleSavePrice}
                          disabled={updateMutation.isPending}
                          className="size-8 rounded-lg bg-brand-gold text-white flex items-center justify-center hover:bg-champagne-gold transition-colors"
                        >
                          <span className="material-symbols-outlined !text-base">check</span>
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={startEditPrice}
                        className="text-2xl font-light text-text-main hover:text-brand-gold transition-colors group flex items-center gap-1.5"
                      >
                        {item.targetPrice ? formatPrice(item.targetPrice) : 'Not set'}
                        <span className="material-symbols-outlined !text-sm text-text-muted opacity-0 group-hover:opacity-100 transition-opacity">edit</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Restock Frequency */}
                {restockEstimate && (
                  <div className="pt-4 border-t border-border-light flex items-center gap-2">
                    <span className="material-symbols-outlined !text-base text-brand-gold">schedule</span>
                    <p className="text-xs text-text-muted">
                      Restock frequency: <span className="font-medium text-text-main">{restockEstimate}</span>
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Price History Chart */}
            {stockHistory.length > 1 && (
              <div className="px-8 pb-6">
                <div className="bg-white rounded-2xl p-6 shadow-soft">
                  <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-4">Price History</p>
                  <PriceChart
                    checks={stockHistory.filter((c) => c.price !== null).slice(0, 60)}
                    formatPrice={formatPrice}
                  />
                </div>
              </div>
            )}

            {/* Stock Timeline */}
            {stockHistory.length > 0 && (
              <div className="px-8 pb-6">
                <div className="bg-white rounded-2xl p-6 shadow-soft">
                  <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-4">Stock Timeline</p>
                  <div className="flex items-center gap-1 flex-wrap">
                    {stockHistory.slice(0, 90).reverse().map((check, i) => (
                      <div
                        key={i}
                        title={`${check.inStock ? 'In Stock' : 'Out of Stock'} — ${formatDate(check.checkedAt)}`}
                        className={clsx(
                          'size-2.5 rounded-full transition-transform hover:scale-150',
                          check.inStock ? 'bg-sage-text' : 'bg-stone-200'
                        )}
                      />
                    ))}
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <div className="size-2 rounded-full bg-sage-text" />
                        <span className="text-[10px] text-text-muted">In Stock</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="size-2 rounded-full bg-stone-200" />
                        <span className="text-[10px] text-text-muted">Out of Stock</span>
                      </div>
                    </div>
                    <span className="text-[10px] text-text-muted">
                      Last {Math.min(stockHistory.length, 90)} checks
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Controls */}
            <div className="px-8 pb-6">
              <div className="bg-white rounded-2xl p-6 shadow-soft space-y-4">
                <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Controls</p>

                {/* Pause/Resume */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-text-main">Monitoring Status</p>
                    <p className="text-xs text-text-muted mt-0.5">
                      {item.isActive ? 'Actively checking for changes' : 'Monitoring is paused'}
                    </p>
                  </div>
                  <button
                    onClick={handleToggleActive}
                    disabled={updateMutation.isPending}
                    className={clsx(
                      'relative w-12 h-6 rounded-full transition-colors',
                      item.isActive ? 'bg-brand-gold' : 'bg-stone-200'
                    )}
                  >
                    <div
                      className={clsx(
                        'absolute top-1 size-4 rounded-full bg-white shadow transition-transform',
                        item.isActive ? 'translate-x-7' : 'translate-x-1'
                      )}
                    />
                  </button>
                </div>

                {/* View on Store */}
                <a
                  href={item.product.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full bg-stone-50 hover:bg-stone-100 text-text-main py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors"
                >
                  <span className="material-symbols-outlined !text-base">open_in_new</span>
                  View on Store
                </a>
              </div>
            </div>

            {/* Notifications */}
            {notifications.length > 0 && (
              <div className="px-8 pb-6">
                <div className="bg-white rounded-2xl p-6 shadow-soft">
                  <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-4">
                    Notification History
                  </p>
                  <div className="space-y-3">
                    {notifications.slice(0, 10).map((n) => (
                      <div key={n.id} className="flex items-start gap-3">
                        <span
                          className={clsx(
                            'material-symbols-outlined !text-base mt-0.5',
                            n.type === 'back_in_stock' && 'text-sage-text',
                            n.type === 'price_drop' && 'text-brand-gold',
                            n.type === 'price_target_hit' && 'text-champagne-gold'
                          )}
                        >
                          {n.type === 'back_in_stock' ? 'inventory' : n.type === 'price_drop' ? 'trending_down' : 'flag'}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-text-main">
                            {n.type === 'back_in_stock'
                              ? 'Back in Stock'
                              : n.type === 'price_drop'
                                ? 'Price Drop Detected'
                                : 'Target Price Hit'}
                          </p>
                          <p className="text-[10px] text-text-muted mt-0.5">
                            {formatDate(n.createdAt)} at {formatTime(n.createdAt)}
                          </p>
                        </div>
                        <span
                          className={clsx(
                            'text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider',
                            n.status === 'sent' && 'bg-sage-bg text-sage-text',
                            n.status === 'pending' && 'bg-stone-100 text-stone-400',
                            n.status === 'failed' && 'bg-blush-bg text-blush-text'
                          )}
                        >
                          {n.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Delete */}
            <div className="px-8 pb-10">
              <button
                onClick={() => {
                  if (window.confirm('Remove this item from your tracked collection?')) {
                    deleteMutation.mutate();
                  }
                }}
                disabled={deleteMutation.isPending}
                className="w-full flex items-center justify-center gap-2 text-blush-text hover:bg-blush-bg py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors"
              >
                <span className="material-symbols-outlined !text-base">delete</span>
                {deleteMutation.isPending ? 'Removing...' : 'Remove from Collection'}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// Lightweight SVG price chart
function PriceChart({
  checks,
  formatPrice,
}: {
  checks: { price: number | null; checkedAt: Date | string }[];
  formatPrice: (cents: number) => string;
}) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Reverse so oldest is first (left)
  const points = useMemo(() => [...checks].reverse(), [checks]);

  if (points.length < 2) return null;

  const prices = points.map((p) => p.price!);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const range = maxPrice - minPrice || 1;

  const width = 420;
  const height = 100;
  const padX = 0;
  const padY = 8;

  const getX = (i: number) => padX + (i / (points.length - 1)) * (width - padX * 2);
  const getY = (price: number) => padY + (1 - (price - minPrice) / range) * (height - padY * 2);

  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${getX(i).toFixed(1)},${getY(p.price!).toFixed(1)}`)
    .join(' ');

  const areaD = pathD + ` L${getX(points.length - 1).toFixed(1)},${height} L${getX(0).toFixed(1)},${height} Z`;

  const formatChartDate = (d: Date | string) => {
    const date = typeof d === 'string' ? new Date(d) : d;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto"
        preserveAspectRatio="none"
        onMouseLeave={() => setHoveredIndex(null)}
      >
        {/* Gradient fill */}
        <defs>
          <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#C5A059" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#C5A059" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaD} fill="url(#priceGradient)" />
        <path d={pathD} fill="none" stroke="#C5A059" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

        {/* Invisible hover zones */}
        {points.map((_, i) => (
          <rect
            key={i}
            x={getX(i) - (width / points.length) / 2}
            y={0}
            width={width / points.length}
            height={height}
            fill="transparent"
            onMouseEnter={() => setHoveredIndex(i)}
          />
        ))}

        {/* Hover dot */}
        {hoveredIndex !== null && (
          <circle
            cx={getX(hoveredIndex)}
            cy={getY(points[hoveredIndex].price!)}
            r="4"
            fill="#C5A059"
            stroke="white"
            strokeWidth="2"
          />
        )}
      </svg>

      {/* Tooltip */}
      {hoveredIndex !== null && (
        <div
          className="absolute -top-10 pointer-events-none bg-text-main text-white text-[10px] font-medium px-2.5 py-1 rounded-lg whitespace-nowrap"
          style={{
            left: `${(hoveredIndex / (points.length - 1)) * 100}%`,
            transform: 'translateX(-50%)',
          }}
        >
          {formatPrice(points[hoveredIndex].price!)} &middot; {formatChartDate(points[hoveredIndex].checkedAt)}
        </div>
      )}

      {/* Price labels */}
      <div className="flex items-center justify-between mt-2">
        <span className="text-[10px] text-text-muted">{formatPrice(minPrice)}</span>
        <span className="text-[10px] text-text-muted">{formatPrice(maxPrice)}</span>
      </div>
    </div>
  );
}
