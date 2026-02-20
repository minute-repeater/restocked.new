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
    <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-gray-900">
          Track a Product
        </h2>
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-1.5">
            Product URL
          </label>
          <input
            id="url"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste any product URL..."
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            disabled={isLoading}
          />
          <p className="mt-1.5 text-xs text-gray-500">
            Works with Amazon, Apple, Uniqlo, and most major retailers
          </p>
        </div>

        {!showTargetPrice ? (
          <button
            type="button"
            onClick={() => setShowTargetPrice(true)}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add price alert
          </button>
        ) : (
          <div>
            <label htmlFor="targetPrice" className="block text-sm font-medium text-gray-700 mb-1.5">
              Notify me when price drops to
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-gray-500 text-sm">$</span>
              <input
                id="targetPrice"
                type="number"
                step="0.01"
                min="0"
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
                placeholder="0.00"
                className="w-full pl-7 pr-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                disabled={isLoading}
                autoFocus
              />
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading || !url.trim()}
          className="w-full bg-blue-600 text-white py-2.5 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Adding product...
            </>
          ) : (
            'Track Product'
          )}
        </button>
      </div>
    </form>
  );
}
