import { useState, useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { addTrackedItem, previewProduct, type ProductPreview } from '../api/tracking';

function formatPrice(cents: number, currency: string | null) {
  const value = cents / 100;
  const cur = currency || 'USD';
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: cur }).format(value);
  } catch {
    return `$${value.toFixed(2)}`;
  }
}

function isValidUrl(str: string) {
  try {
    const u = new URL(str);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

export function AddProduct() {
  const { token, user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [url, setUrl] = useState('');
  const [targetPrice, setTargetPrice] = useState('');
  const [stockNotification, setStockNotification] = useState(true);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<ProductPreview | null>(null);
  const previewUrlRef = useRef('');

  // Debounced preview fetch
  const previewMutation = useMutation({
    mutationFn: ({ url }: { url: string }) => previewProduct(token!, url),
    onSuccess: (data, variables) => {
      if (variables.url === previewUrlRef.current) {
        setPreview(data);
      }
    },
  });

  useEffect(() => {
    const trimmed = url.trim();
    if (!trimmed || !isValidUrl(trimmed)) {
      setPreview(null);
      previewUrlRef.current = '';
      return;
    }

    previewUrlRef.current = trimmed;
    const timer = setTimeout(() => {
      previewMutation.mutate({ url: trimmed });
    }, 500);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, token]);

  const addMutation = useMutation({
    mutationFn: ({ url, targetPrice }: { url: string; targetPrice?: number }) =>
      addTrackedItem(token!, url, targetPrice),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trackedItems'] });
      navigate('/dashboard');
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : 'Failed to add product');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!url.trim()) {
      setError('Please enter a product URL');
      return;
    }

    const priceValue = targetPrice ? Math.round(parseFloat(targetPrice) * 100) : undefined;
    addMutation.mutate({ url: url.trim(), targetPrice: priceValue });
  };

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

  const isSubmitting = addMutation.isPending;
  const isPreviewing = previewMutation.isPending;
  const previewFailed = previewMutation.isError && !preview;
  const hasUrl = url.trim().length > 0;

  return (
    <div className="flex flex-1 justify-center items-start pt-8 pb-24 px-6">
      <div className="w-full max-w-[620px] flex flex-col gap-12">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="font-display italic text-5xl md:text-6xl text-text-main leading-tight">
            Begin Tracking
          </h1>
          <p className="text-text-muted text-sm font-light tracking-wide max-w-sm mx-auto leading-relaxed">
            Paste the URL from any high-end boutique to start your automated inventory monitoring.
          </p>
        </div>

        {/* URL Input */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-12">
          <div className="relative group max-w-lg mx-auto w-full">
            <input
              className="w-full bg-white/50 border border-border-light rounded-2xl focus:ring-4 focus:ring-brand-gold/5 focus:border-brand-gold/40 py-5 px-6 text-lg font-light placeholder:text-stone-300 transition-all text-center shadow-sm"
              placeholder="https://www.boutique.com/..."
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={isSubmitting}
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-300 group-focus-within:text-brand-gold transition-colors">
              <span className="material-symbols-outlined">link</span>
            </div>
          </div>

          {/* Product Card (shown when URL entered) */}
          {hasUrl && (
            <div className="bg-white rounded-[2rem] p-8 md:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-stone-100 flex flex-col gap-10">
              {/* Product Preview */}
              <div className="grid md:grid-cols-[200px_1fr] gap-10 items-start">
                {/* Image */}
                <div className="aspect-[4/5] bg-stone-50 rounded-2xl overflow-hidden shadow-inner border border-stone-100 flex items-center justify-center">
                  {isPreviewing ? (
                    <div className="w-full h-full animate-pulse bg-gradient-to-br from-stone-100 to-stone-50" />
                  ) : preview?.imageUrl ? (
                    <img
                      src={preview.imageUrl}
                      alt={preview.name || 'Product'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="material-symbols-outlined text-soft-gold !text-5xl">inventory_2</span>
                  )}
                </div>

                {/* Details */}
                <div className="flex flex-col gap-6">
                  <div className="space-y-2">
                    {isPreviewing ? (
                      <>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="material-symbols-outlined animate-spin text-brand-gold !text-sm">progress_activity</span>
                          <span className="text-[10px] font-bold tracking-[0.2em] text-brand-gold uppercase">
                            Fetching Details
                          </span>
                        </div>
                        <div className="h-7 w-48 bg-stone-100 rounded-lg animate-pulse" />
                        <div className="h-4 w-32 bg-stone-50 rounded animate-pulse mt-1" />
                      </>
                    ) : preview?.name ? (
                      <>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="size-1.5 rounded-full bg-emerald-500" />
                          <span className="text-[10px] font-bold tracking-[0.2em] text-emerald-600 uppercase">
                            Product Found
                          </span>
                        </div>
                        <h3 className="text-2xl font-display text-text-main leading-snug">
                          {preview.name}
                        </h3>
                        <div className="flex items-center gap-3 flex-wrap">
                          {preview.price != null && (
                            <span className="text-lg font-semibold text-text-main">
                              {formatPrice(preview.price, preview.currency)}
                            </span>
                          )}
                          {preview.inStock != null && (
                            <span className={`text-[10px] font-bold tracking-[0.15em] uppercase px-2.5 py-1 rounded-full ${
                              preview.inStock
                                ? 'bg-emerald-50 text-emerald-600'
                                : 'bg-red-50 text-red-500'
                            }`}>
                              {preview.inStock ? 'In Stock' : 'Out of Stock'}
                            </span>
                          )}
                        </div>
                        {preview.retailer && (
                          <p className="text-xs text-text-muted uppercase tracking-[0.15em] font-medium">
                            {preview.retailer}
                          </p>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="size-1.5 rounded-full bg-brand-gold animate-pulse" />
                          <span className="text-[10px] font-bold tracking-[0.2em] text-brand-gold uppercase">
                            {previewFailed ? 'Preview Unavailable' : 'Ready to Track'}
                          </span>
                        </div>
                        <h3 className="text-2xl font-display text-text-main">
                          New Product
                        </h3>
                        <p className="text-xs text-text-muted uppercase tracking-[0.15em] font-medium">
                          {previewFailed
                            ? "Couldn\u2019t preview \u2014 details will be fetched on activation"
                            : 'Product details will be fetched automatically'}
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Settings */}
              <div className="space-y-8 pt-8 border-t border-stone-100">
                {/* Stock Notification Toggle */}
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-text-main">Stock Notification</p>
                    <p className="text-xs text-text-muted">Alert me immediately when this item returns.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      checked={stockNotification}
                      onChange={(e) => setStockNotification(e.target.checked)}
                      className="sr-only peer"
                      type="checkbox"
                    />
                    <div className="w-12 h-6 bg-stone-200 peer-focus:outline-none rounded-full peer-checked:after:translate-x-6 peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-gold shadow-inner" />
                  </label>
                </div>

                {/* Target Price */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-text-main">Target Price</p>
                    <p className="text-xs text-text-muted">Notify if price drops below this value.</p>
                  </div>
                  <div className="relative w-full md:w-36">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-text-muted">$</span>
                    <input
                      className="w-full bg-stone-50 border-stone-200 rounded-xl focus:ring-brand-gold/20 focus:border-brand-gold pl-8 py-3 text-sm text-right font-medium"
                      placeholder="0.00"
                      type="number"
                      step="0.01"
                      min="0"
                      value={targetPrice}
                      onChange={(e) => setTargetPrice(e.target.value)}
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-center gap-3 text-sm text-red-600 bg-red-50 px-4 py-3 rounded-xl">
                  <span className="material-symbols-outlined !text-lg">error</span>
                  {error}
                </div>
              )}
            </div>
          )}

          {/* Submit Button */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={isSubmitting || !url.trim()}
              className="group relative w-full overflow-hidden rounded-full bg-text-main text-white h-16 transition-all hover:bg-brand-gold hover:shadow-xl hover:shadow-brand-gold/20 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <div className="relative z-10 flex items-center justify-center gap-4">
                {isSubmitting ? (
                  <>
                    <span className="material-symbols-outlined animate-spin !text-base">progress_activity</span>
                    <span className="text-xs font-bold tracking-[0.3em] uppercase">Adding Product...</span>
                  </>
                ) : (
                  <>
                    <span className="text-xs font-bold tracking-[0.3em] uppercase">Activate Tracking</span>
                    <span className="material-symbols-outlined text-base transition-transform group-hover:translate-x-2">arrow_right_alt</span>
                  </>
                )}
              </div>
            </button>
            <p className="text-center mt-8 text-[10px] uppercase tracking-[0.25em] text-text-muted font-medium">
              Monitoring 250+ Global Retailers
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
