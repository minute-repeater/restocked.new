import { apiRequest } from './client';
import type {
  TrackedItemWithDetails,
  ItemDetailResponse,
  StockCheckRecord,
  NotificationRecord,
} from '@restocked/shared';

export async function getTrackedItems(
  token: string
): Promise<{ items: TrackedItemWithDetails[] }> {
  return apiRequest<{ items: TrackedItemWithDetails[] }>('/tracking', {
    token,
  });
}

export async function addTrackedItem(
  token: string,
  url: string,
  targetPrice?: number
): Promise<{ item: unknown }> {
  return apiRequest<{ item: unknown }>('/tracking', {
    method: 'POST',
    token,
    body: { url, targetPrice },
  });
}

export async function updateTrackedItem(
  token: string,
  itemId: string,
  updates: { targetPrice?: number | null; isActive?: boolean }
): Promise<{ item: unknown }> {
  return apiRequest<{ item: unknown }>(`/tracking/${itemId}`, {
    method: 'PATCH',
    token,
    body: updates,
  });
}

export async function deleteTrackedItem(
  token: string,
  itemId: string
): Promise<void> {
  return apiRequest<void>(`/tracking/${itemId}`, {
    method: 'DELETE',
    token,
  });
}

export async function getTrackedItemDetail(
  token: string,
  itemId: string
): Promise<ItemDetailResponse> {
  return apiRequest<ItemDetailResponse>(`/tracking/${itemId}`, {
    token,
  });
}

export async function getStockHistory(
  token: string,
  itemId: string
): Promise<{ checks: StockCheckRecord[] }> {
  return apiRequest<{ checks: StockCheckRecord[] }>(`/tracking/${itemId}/history`, {
    token,
  });
}

export async function getItemNotifications(
  token: string,
  itemId: string
): Promise<{ notifications: NotificationRecord[] }> {
  return apiRequest<{ notifications: NotificationRecord[] }>(`/tracking/${itemId}/notifications`, {
    token,
  });
}
