import axios, { AxiosError } from 'axios';
import type { ErrorResponse } from '@/types/api';
import { useAuthStore } from '@/store/authStore';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

// Comprehensive runtime diagnostic logging
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("🔍 [apiClient] RUNTIME ENVIRONMENT DIAGNOSTIC");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("📍 Final API_BASE_URL value:", API_BASE_URL);
console.log("📍 import.meta.env.VITE_API_BASE_URL:", import.meta.env.VITE_API_BASE_URL);
console.log("");
console.log("📋 All import.meta.env properties:");
Object.keys(import.meta.env).forEach(key => {
  const value = import.meta.env[key];
  const displayValue = typeof value === 'string' && value.length > 100 
    ? value.substring(0, 100) + '...' 
    : value;
  console.log(`   ${key} = ${displayValue}`);
});
console.log("");
console.log("📋 VITE_* environment variables only:");
Object.keys(import.meta.env)
  .filter(key => key.startsWith("VITE_"))
  .forEach(key => {
    console.log(`   ${key} = ${import.meta.env[key]}`);
  });
console.log("");
console.log("⚠️  Checking for typo variable:");
console.log(`   import.meta.env.VITE_APT_BASE_URL = ${import.meta.env.VITE_APT_BASE_URL || '(not found - good!)'}`);
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: Add auth token from Zustand
apiClient.interceptors.request.use(
  (config) => {
    const { token } = useAuthStore.getState();
    if (token) {
      config.headers = config.headers ?? {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: Handle 401 and log out
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ErrorResponse>) => {
    const status = error.response?.status;

    if (status === 401) {
      const url = error.config?.url ?? '';

      // Let /auth/login and /auth/register handle their own 401s
      const isAuthEndpoint = url.includes('/auth/');
      if (!isAuthEndpoint) {
        // Clear auth state in *one* place
        useAuthStore.getState().logout();
        // Hard redirect to login (token is now null, so router won't bounce us back)
        window.location.assign('/login');
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;

