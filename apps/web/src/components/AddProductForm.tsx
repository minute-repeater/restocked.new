import { useState } from 'react';

interface AddProductFormProps {
  onSubmit: (url: string, targetPrice?: number) => Promise<void>;
  isLoading: boolean;
}

export function AddProductForm({ onSubmit, isLoading }: AddProductFormProps) {
  const [url, setUrl] = useState('');
  const [targetPrice, setTargetPrice] = useState('');
  const [error, setError] = useState('');
  const [showTargetPrice, setShowTargetPrice] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!url.trim()) {
      setError('Please enter a product URL');
      return;
    }

    try {
      const priceValue = targetPrice ? Math.round(parseFloat(targetPrice) * 100) : undefined;
      await onSubmit(url.trim(), priceValue);
      setUrl('');
      setTargetPrice('');
      setShowTargetPrice(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add product');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-soft border border-border-light p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="size-10 bg-cream rounded-2xl flex items-center justify-center">
          <span className="material-symbols-outlined text-brand-gold">add_link</span>
        </div>
        <div>
          <h2 className="text-sm font-bold text-text-main">Track a Product</h2>
          <p className="text-[10px] text-text-muted uppercase tracking-widest">Paste any product URL</p>
        </div>
      </div>

      <div className="space-y-5">
        <div>
          <label htmlFor="url" className="block text-[10px] font-bold uppercase tracking-[0.2em] text-text-muted mb-2">
            Product URL
          </label>
          <input
            id="url"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://store.com/product..."
            className="w-full px-4 py-3.5 border border-border-light rounded-xl text-sm font-light focus:ring-2 focus:ring-brand-gold/10 focus:border-brand-gold/40 transition-all placeholder:text-stone-300"
            disabled={isLoading}
          />
          <p className="mt-2 text-[10px] text-text-muted tracking-wide">
            Works with Shopify stores, independent boutiques, and major retailers
          </p>
        </div>

        {!showTargetPrice ? (
          <button
            type="button"
            onClick={() => setShowTargetPrice(true)}
            className="text-xs text-brand-gold hover:text-champagne-gold font-bold flex items-center gap-1.5 transition-colors"
          >
            <span className="material-symbols-outlined !text-sm">add</span>
            Set a target price
          </button>
        ) : (
          <div>
            <label htmlFor="targetPrice" className="block text-[10px] font-bold uppercase tracking-[0.2em] text-text-muted mb-2">
              Notify me at this price
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted text-sm">$</span>
              <input
                id="targetPrice"
                type="number"
                step="0.01"
                min="0"
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
                placeholder="0.00"
                className="w-full pl-8 pr-4 py-3.5 border border-border-light rounded-xl text-sm font-light focus:ring-2 focus:ring-brand-gold/10 focus:border-brand-gold/40 transition-all placeholder:text-stone-300"
                disabled={isLoading}
                autoFocus
              />
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-3 text-sm text-blush-text bg-blush-bg px-4 py-3 rounded-xl">
            <span className="material-symbols-outlined !text-lg">error</span>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading || !url.trim()}
          className="group w-full bg-brand-gold text-white py-4 rounded-2xl text-[10px] font-bold uppercase tracking-[0.25em] hover:bg-champagne-gold disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3 shadow-lg shadow-brand-gold/20"
        >
          {isLoading ? (
            <>
              <span className="material-symbols-outlined animate-spin !text-sm">progress_activity</span>
              Scanning Product...
            </>
          ) : (
            <>
              Begin Tracking
              <span className="material-symbols-outlined !text-sm transition-transform group-hover:translate-x-1">arrow_right_alt</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}
