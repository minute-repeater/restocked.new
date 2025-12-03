import apiClient from '@/lib/apiClient';

export interface NotificationSettings {
  user_id: string;
  email_enabled: boolean;
  push_enabled: boolean;
  threshold_percentage: number;
  created_at: string;
  updated_at: string;
}

export interface NotificationSettingsResponse {
  settings: NotificationSettings;
}

export interface UpdateNotificationSettingsInput {
  email_enabled?: boolean;
  push_enabled?: boolean;
  threshold_percentage?: number;
}

export interface UpdateNotificationSettingsResponse {
  success: boolean;
  settings: NotificationSettings;
}

export const settingsApi = {
  get: async (): Promise<NotificationSettingsResponse> => {
    const response = await apiClient.get<NotificationSettingsResponse>('/me/settings/notifications');
    return response.data;
  },

  update: async (data: UpdateNotificationSettingsInput): Promise<UpdateNotificationSettingsResponse> => {
    const response = await apiClient.post<UpdateNotificationSettingsResponse>('/me/settings/notifications', data);
    return response.data;
  },
};

