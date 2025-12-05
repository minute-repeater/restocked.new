/**
 * Development Login Bypass Component
 * ONLY for testing/staging - NEVER use in production
 * 
 * Usage: Set VITE_BYPASS_AUTH=true in Vercel (Preview/Development only)
 */

import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useNavigate } from 'react-router-dom';

export function DevLoginBypass() {
  const { login } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    // ONLY bypass in non-production environments with explicit flag
    const isDev = import.meta.env.MODE !== 'production';
    const bypassEnabled = import.meta.env.VITE_BYPASS_AUTH === 'true';
    
    if (isDev && bypassEnabled) {
      console.warn('⚠️ DEV MODE: Auto-login bypass enabled');
      
      login({
        user: {
          id: 'dev-user-1',
          email: 'dev@test.com',
          plan: 'free',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        token: 'dev-bypass-token-not-valid-for-api',
      });
      
      navigate('/dashboard', { replace: true });
    }
  }, [login, navigate]);

  // Don't render anything
  return null;
}



