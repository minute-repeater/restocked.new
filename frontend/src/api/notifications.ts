import apiClient from '@/lib/apiClient';

export interface Notification {
  id: number;
  user_id: string;
  product_id: number;
  variant_id: number | null;
  type: 'STOCK' | 'PRICE' | 'RESTOCK';
  message: string | null;
  old_price: number | null;
  new_price: number | null;
  old_status: string | null;
  new_status: string | null;
  created_at: string;
  sent: boolean;
  sent_at: string | null;
  read: boolean;
  notify_price_change: boolean;
  notify_restock: boolean;
  notify_oos: boolean;
  metadata: any;
}

export interface NotificationsResponse {
  notifications: Notification[];
  pagination: {
    limit: number;
    offset: number;
    count: number;
  };
  unreadCount: number;
}

export interface MarkReadResponse {
  success: boolean;
  markedCount: number;
}

export const notificationsApi = {
  getAll: async (limit: number = 50, offset: number = 0): Promise<NotificationsResponse> => {
    const response = await apiClient.get<NotificationsResponse>('/me/notifications', {
      params: { limit, offset },
    });
    return response.data;
  },

  markAsRead: async (notificationIds?: number[]): Promise<MarkReadResponse> => {
    const response = await apiClient.post<MarkReadResponse>('/me/notifications/mark-read', {
      notificationIds,
    });
    return response.data;
  },
};

