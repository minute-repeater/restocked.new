import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { notificationsApi } from '@/api/notifications';
import { productsApi } from '@/api/products';
import { NotificationCard } from '@/components/NotificationCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Bell, CheckCheck, Settings } from 'lucide-react';
import { useState, useMemo } from 'react';

export function Notifications() {
  const queryClient = useQueryClient();
  const [markingAll, setMarkingAll] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.getAll(50, 0),
  });

  const markAsReadMutation = useMutation({
    mutationFn: (notificationIds?: number[]) => notificationsApi.markAsRead(notificationIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unreadCount'] });
    },
  });

  const handleMarkAllAsRead = async () => {
    setMarkingAll(true);
    try {
      await markAsReadMutation.mutateAsync([]);
    } finally {
      setMarkingAll(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Notifications</h1>
          <p className="text-gray-600">Your notification feed</p>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Notifications</h1>
          <p className="text-gray-600">Your notification feed</p>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-red-600">Failed to load notifications. Please try again.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const notifications = data?.notifications || [];
  const unreadCount = data?.unreadCount || 0;

  // Fetch product names for notifications
  const productIds = useMemo(() => {
    return [...new Set(notifications.map(n => n.product_id))];
  }, [notifications]);

  const { data: productsData } = useQuery({
    queryKey: ['products', 'notifications', productIds],
    queryFn: async () => {
      const products: Record<number, { name: string | null; url: string; main_image_url: string | null }> = {};
      await Promise.all(
        productIds.map(async (id) => {
          try {
            const product = await productsApi.getById(id);
            products[id] = {
              name: product.product.name,
              url: product.product.url,
              main_image_url: product.product.main_image_url,
            };
          } catch (error) {
            products[id] = { name: null, url: '', main_image_url: null };
          }
        })
      );
      return products;
    },
    enabled: productIds.length > 0,
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Notifications</h1>
          <p className="text-gray-600">
            {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}` : 'All caught up!'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/settings/notifications">
            <Button variant="ghost" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </Link>
          {unreadCount > 0 && (
            <Button
              onClick={handleMarkAllAsRead}
              disabled={markingAll || markAsReadMutation.isPending}
              variant="outline"
            >
              <CheckCheck className="h-4 w-4 mr-2" />
              {markingAll || markAsReadMutation.isPending ? 'Marking...' : 'Mark all as read'}
            </Button>
          )}
        </div>
      </div>

      {notifications.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Bell className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500 mb-2">No notifications yet</p>
            <p className="text-sm text-gray-400">
              When products you're tracking have price or stock changes, you'll see them here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {notifications.map((notification) => {
            const product = productsData?.[notification.product_id];
            return (
              <NotificationCard
                key={notification.id}
                notification={notification}
                productName={product?.name || undefined}
                productUrl={product?.url}
                productImageUrl={product?.main_image_url}
                variantAttributes={notification.metadata?.variantAttributes}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

