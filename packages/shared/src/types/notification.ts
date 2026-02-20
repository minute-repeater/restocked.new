export type NotificationType = 'back_in_stock' | 'price_drop' | 'price_target_hit';
export type NotificationStatus = 'pending' | 'sent' | 'failed';

export interface Notification {
  id: string;
  userId: string;
  trackedItemId: string;
  type: NotificationType;
  status: NotificationStatus;
  sentAt: Date | null;
  createdAt: Date;
}

export interface NotificationPayload {
  type: NotificationType;
  productName: string;
  productUrl: string;
  imageUrl: string | null;
  previousPrice: number | null;
  currentPrice: number | null;
  targetPrice: number | null;
}
