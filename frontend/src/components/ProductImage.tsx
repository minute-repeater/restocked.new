import { useState } from 'react';
import { Package } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProductImageProps {
  src: string | null | undefined;
  alt?: string;
  className?: string;
  fallbackClassName?: string;
}

export function ProductImage({ src, alt = 'Product image', className, fallbackClassName }: ProductImageProps) {
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  // Normalize image URL (handle relative URLs)
  const normalizeImageUrl = (url: string | null | undefined): string | null => {
    if (!url) return null;
    
    // If already absolute URL, return as-is
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    
    // If protocol-relative URL (//example.com/image.jpg), add https:
    if (url.startsWith('//')) {
      return `https:${url}`;
    }
    
    // If relative URL, we can't resolve it without the product URL
    // Return null to show fallback
    if (url.startsWith('/')) {
      return null;
    }
    
    return url;
  };

  const imageUrl = normalizeImageUrl(src);

  if (!imageUrl || error) {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-gray-100 text-gray-400',
          className || 'w-full h-48',
          fallbackClassName
        )}
      >
        <Package className="h-12 w-12" />
      </div>
    );
  }

  return (
    <div className={cn('relative overflow-hidden', className || 'w-full h-48')}>
      {loading && (
        <div className="absolute inset-0 bg-gray-100 animate-pulse flex items-center justify-center">
          <Package className="h-8 w-8 text-gray-300" />
        </div>
      )}
      <img
        src={imageUrl}
        alt={alt}
        className={cn(
          'w-full h-full object-cover transition-opacity duration-200',
          loading ? 'opacity-0' : 'opacity-100'
        )}
        onLoad={() => setLoading(false)}
        onError={() => {
          setError(true);
          setLoading(false);
        }}
      />
    </div>
  );
}

