import apiClient from '@/lib/apiClient';
import type { PriceHistoryEntry, StockHistoryEntry } from '@/types/api';

interface VariantResponse {
  variant: any;
  priceHistory: PriceHistoryEntry[];
  stockHistory: StockHistoryEntry[];
}

export const historyApi = {
  getVariantWithHistory: async (variantId: number): Promise<VariantResponse> => {
    const response = await apiClient.get<VariantResponse>(`/variants/${variantId}`);
    return response.data;
  },
};

