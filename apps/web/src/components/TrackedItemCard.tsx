import type { TrackedItemWithDetails } from '@covet/shared';
import clsx from 'clsx';

interface TrackedItemCardProps {
  item: TrackedItemWithDetails;
  onDelete: () => void;
  isDeleting?: boolean;
  onClick?: () => void;
}

export function TrackedItemCard({ item, onDelete, isDeleting, onClick }: TrackedItemCardProps) {
  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  const isInStock = item.latestCheck?.inStock;
  const price = item.latestCheck?.price;

  const retailerName = item.product.retailer
    ? item.product.retailer.charAt(0).toUpperCase() + item.product.retailer.slice(1)
    : 'Unknown';

  // Determine if there's a price drop (simple heuristic: if targetPrice exists and current price is lower)
  const hasPriceDrop = item.targetPrice && price && price <= item.targetPrice;

  return (
    <div
      onClick={onClick}
      className={clsx(
        'group bg-white rounded-3xl overflow-hidden shadow-soft hover:shadow-hover transition-all flex flex-col border border-white',
        isDeleting && 'opacity-50 pointer-events-none',
        onClick && 'cursor-pointer'
      )}
    >
      {/* Image */}
      <div className="relative aspect-[4/5] overflow-hidden bg-gray-50">
        {item.product.imageUrl ? (
          <div
            className="absolute inset-0 bg-center bg-cover transition-transform duration-700 group-hover:scale-105"
            style={{ backgroundImage: `url('${item.product.imageUrl}')` }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-text-muted">
            <span className="material-symbols-outlined !text-5xl">image</span>
          </div>
        )}
        <div className="absolute top-4 left-4">
          <span
            className={clsx(
              'text-[9px] font-bold px-3 py-1.5 rounded-full uppercase tracking-wider backdrop-blur-sm',
              isInStock === true && 'bg-[#FDF8EE] text-brand-gold border border-brand-gold/20',
              isInStock === false && 'bg-gray-100/80 text-text-muted border border-black/5',
              isInStock === undefined && 'bg-gray-100/80 text-text-muted border border-black/5'
            )}
          >
            {isInStock === true
              ? 'In Stock'
              : isInStock === false
                ? 'Out of Stock'
                : 'Monitoring'}
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="p-6 flex-1 flex flex-col">
        <div className="mb-4">
          <h3 className="font-semibold text-text-main text-sm line-clamp-1 mb-1">
            {item.product.name || 'Loading product info...'}
          </h3>
          <p className="text-[11px] text-text-muted uppercase tracking-widest">
            {retailerName}
          </p>
        </div>

        {/* Price */}
        <div className="mt-auto flex items-end justify-between mb-6">
          <div>
            {hasPriceDrop && item.targetPrice && (
              <p className="text-[10px] text-blush-text line-through font-bold tracking-widest uppercase mb-0.5">
                {formatPrice(item.targetPrice)}
              </p>
            )}
            <p className="text-[10px] text-text-muted font-bold tracking-widest uppercase mb-1">
              Current
            </p>
            <p className={clsx(
              'text-lg font-bold',
              isInStock === true ? 'text-brand-gold' : 'text-text-main'
            )}>
              {price ? formatPrice(price) : '—'}
            </p>
          </div>
          {hasPriceDrop && price && item.targetPrice && (
            <div className="bg-blush-bg px-2 py-1 rounded-lg text-[10px] font-bold text-blush-text">
              -{Math.round(((item.targetPrice - price) / item.targetPrice) * 100)}%
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <a
            href={item.product.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex-1 bg-gray-100 hover:bg-brand-gold/10 hover:text-brand-gold text-text-main transition-colors py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest text-center"
          >
            {isInStock ? 'Buy Now' : 'View Item'}
          </a>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            disabled={isDeleting}
            className="p-2.5 text-text-muted hover:text-blush-text hover:bg-blush-bg transition-all rounded-xl"
          >
            <span className="material-symbols-outlined">delete</span>
          </button>
        </div>
      </div>
    </div>
  );
}
