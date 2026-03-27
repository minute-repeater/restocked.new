import { apiRequest } from './client';
import type { AuthResponse } from '@covet/shared';

export async function register(
  email: string,
  password: string
): Promise<AuthResponse> {
  return apiRequest<AuthResponse>('/auth/register', {
    method: 'POST',
    body: { email, password },
  });
}

export async function login(
  email: string,
  password: string
): Promise<AuthResponse> {
  return apiRequest<AuthResponse>('/auth/login', {
    method: 'POST',
    body: { email, password },
  });
}

export async function getMe(token: string): Promise<{ user: AuthResponse['user'] }> {
  return apiRequest<{ user: AuthResponse['user'] }>('/auth/me', {
    token,
  });
}

export async function forgotPassword(email: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>('/auth/forgot-password', {
    method: 'POST',
    body: { email },
  });
}

export async function resetPassword(
  token: string,
  password: string
): Promise<{ message: string }> {
  return apiRequest<{ message: string }>('/auth/reset-password', {
    method: 'POST',
    body: { token, password },
  });
}

export async function googleAuth(idToken: string): Promise<AuthResponse> {
  return apiRequest<AuthResponse>('/auth/google', {
    method: 'POST',
    body: { idToken },
  });
}
