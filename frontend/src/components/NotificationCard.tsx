import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { ProductImage } from '@/components/ProductImage';
import { ArrowUpDown, BellRing, PackageCheck, ExternalLink } from 'lucide-react';
import type { Notification } from '@/api/notifications';

function formatTimeAgo(date: string): string {
  const now = new Date();
  const then = new Date(date);
  const diffInSeconds = Math.floor((now.getTime() - then.getTime()) / 1000);
  
  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  return then.toLocaleDateString();
}

interface NotificationCardProps {
  notification: Notification;
  productName?: string;
  productUrl?: string;
  productImageUrl?: string | null;
  variantAttributes?: Record<string, any>;
}

export function NotificationCard({ notification, productName, productUrl, productImageUrl, variantAttributes }: NotificationCardProps) {
  const getIcon = () => {
    switch (notification.type) {
      case 'PRICE':
        return <ArrowUpDown className="h-5 w-5" />;
      case 'RESTOCK':
        return <BellRing className="h-5 w-5" />;
      case 'STOCK':
        return <PackageCheck className="h-5 w-5" />;
      default:
        return <PackageCheck className="h-5 w-5" />;
    }
  };

  const getTypeColor = () => {
    switch (notification.type) {
      case 'PRICE':
        return notification.new_price && notification.old_price && notification.new_price < notification.old_price
          ? 'text-blue-600 bg-blue-50'
          : 'text-orange-600 bg-orange-50';
      case 'RESTOCK':
        return 'text-green-600 bg-green-50';
      case 'STOCK':
        return notification.new_status === 'out_of_stock'
          ? 'text-red-600 bg-red-50'
          : 'text-gray-600 bg-gray-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const formatVariantAttributes = () => {
    if (!variantAttributes || Object.keys(variantAttributes).length === 0) {
      return null;
    }
    return Object.entries(variantAttributes)
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ');
  };

  return (
    <Card className={notification.read ? '' : 'bg-blue-50/50 border-blue-200'}>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {productImageUrl ? (
            <div className="flex-shrink-0 w-20 h-20">
              <ProductImage
                src={productImageUrl}
                alt={productName || 'Product image'}
                className="w-full h-full rounded-lg"
                fallbackClassName="rounded-lg"
              />
            </div>
          ) : (
            <div className={`flex-shrink-0 p-2 rounded-lg ${getTypeColor()}`}>
              {getIcon()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs font-semibold uppercase ${getTypeColor().split(' ')[0]}`}>
                    {notification.type}
                  </span>
                  {!notification.read && (
                    <span className="h-2 w-2 rounded-full bg-blue-600"></span>
                  )}
                </div>
                <h3 className={`font-semibold mb-1 ${notification.read ? 'text-gray-900' : 'text-gray-900 font-bold'}`}>
                  {productName || 'Product'}
                  {productUrl && (
                    <Link
                      to={`/product/${notification.product_id}`}
                      className="ml-2 inline-flex items-center text-blue-600 hover:text-blue-800"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  )}
                </h3>
                {variantAttributes && formatVariantAttributes() && (
                  <p className="text-sm text-gray-600 mb-2">
                    Variant: {formatVariantAttributes()}
                  </p>
                )}
                <p className="text-sm text-gray-700 mb-2">
                  {notification.message || 'Notification'}
                </p>
                {notification.type === 'PRICE' && notification.old_price && notification.new_price && (
                  <div className="text-sm text-gray-600 mb-2">
                    <span className={notification.new_price < notification.old_price ? 'text-green-600 font-semibold' : ''}>
                      ${notification.old_price} → ${notification.new_price}
                    </span>
                  </div>
                )}
                <p className="text-xs text-gray-500">
                  {formatTimeAgo(notification.created_at)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

