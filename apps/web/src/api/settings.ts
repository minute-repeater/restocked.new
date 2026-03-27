import { apiRequest } from './client';

export interface NotificationSettings {
  emailEnabled: boolean;
  emailAddress: string | null;
}

export async function getNotificationSettings(token: string): Promise<NotificationSettings> {
  return apiRequest<NotificationSettings>('/settings/notifications', { token });
}

export async function updateNotificationSettings(
  token: string,
  updates: Partial<NotificationSettings>
): Promise<NotificationSettings> {
  return apiRequest<NotificationSettings>('/settings/notifications', {
    method: 'PATCH',
    token,
    body: updates,
  });
}
