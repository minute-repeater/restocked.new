import { apiRequest } from './client';

// ── Types ───────────────────────────────────────────────────────────

export interface AdminOverviewStats {
  totalUsers: number;
  totalProducts: number;
  activeTrackers: number;
  totalTrackers: number;
  signups7d: number;
  signups30d: number;
  planDistribution: Record<string, number>;
  stockChecks24h: number;
  notifications7d: Record<string, number>;
}

export interface AdminUser {
  id: string;
  email: string;
  plan: string;
  isAdmin: boolean;
  createdAt: string;
  trackedCount: number;
}

export interface AdminUsersResponse {
  users: AdminUser[];
  total: number;
  page: number;
  limit: number;
}

export interface AdminProduct {
  id: string;
  name: string | null;
  url: string;
  retailer: string | null;
  imageUrl: string | null;
  trackerCount: number;
  lastCheckedAt: string | null;
}

export interface AdminProductsResponse {
  products: AdminProduct[];
  total: number;
  page: number;
  limit: number;
}

export interface RetailerHealth {
  retailer: string | null;
  checkCount: number;
  lastCheck: string | null;
}

export interface NotificationDelivery {
  type: string;
  status: string;
  count: number;
}

export interface FailedNotification {
  id: string;
  type: string;
  errorMessage: string | null;
  createdAt: string;
  userEmail: string;
}

export interface AdminHealthResponse {
  retailerHealth: RetailerHealth[];
  notificationDelivery: NotificationDelivery[];
  recentFailures: FailedNotification[];
}

// ── API Functions ───────────────────────────────────────────────────

export function getAdminOverview(token: string) {
  return apiRequest<AdminOverviewStats>('/admin/stats/overview', { token });
}

export function getAdminUsers(token: string, search?: string, page = 1) {
  const params = new URLSearchParams({ page: String(page), limit: '20' });
  if (search) params.set('search', search);
  return apiRequest<AdminUsersResponse>(`/admin/stats/users?${params}`, { token });
}

export function getAdminProducts(token: string, page = 1) {
  return apiRequest<AdminProductsResponse>(`/admin/stats/products?page=${page}&limit=20`, { token });
}

export function getAdminHealth(token: string) {
  return apiRequest<AdminHealthResponse>('/admin/stats/health', { token });
}
