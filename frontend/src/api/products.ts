import apiClient from '@/lib/apiClient';
import type { ProductResponse } from '@/types/api';

export const productsApi = {
  createByUrl: async (url: string): Promise<ProductResponse> => {
    const response = await apiClient.post<ProductResponse>('/products', { url });
    return response.data;
  },

  getById: async (id: number): Promise<ProductResponse> => {
    const response = await apiClient.get<ProductResponse>(`/products/${id}`);
    return response.data;
  },

  getVariants: async (productId: number): Promise<{ variants: any[] }> => {
    const response = await apiClient.get(`/products/${productId}/variants`);
    return response.data;
  },
};

