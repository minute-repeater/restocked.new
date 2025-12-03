import apiClient from '@/lib/apiClient';
import type { TrackedItemsResponse, TrackedItem } from '@/types/api';

export const trackedItemsApi = {
  getAll: async (): Promise<TrackedItemsResponse> => {
    const response = await apiClient.get<TrackedItemsResponse>('/me/tracked-items');
    return response.data;
  },

  create: async (data: { product_id: number; variant_id?: number; url?: string }): Promise<{ tracked_item: TrackedItem }> => {
    const response = await apiClient.post<{ tracked_item: TrackedItem }>('/me/tracked-items', data);
    return response.data;
  },

  delete: async (id: number): Promise<{ success: boolean }> => {
    const response = await apiClient.delete<{ success: boolean }>(`/me/tracked-items/${id}`);
    return response.data;
  },
};

