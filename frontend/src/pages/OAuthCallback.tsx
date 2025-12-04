import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import apiClient from '@/lib/apiClient';
import type { AuthResponse } from '@/types/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

/**
 * OAuth Callback Page
 * Handles OAuth redirects from Google/Apple
 * Extracts token from URL query params and saves to authStore
 */
export function OAuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Safety check: if OAuth is disabled, redirect to login
        const googleOAuthEnabled = import.meta.env.VITE_GOOGLE_OAUTH_ENABLED === 'true';
        const appleOAuthEnabled = import.meta.env.VITE_APPLE_OAUTH_ENABLED === 'true';
        if (!googleOAuthEnabled && !appleOAuthEnabled) {
          setError('OAuth is not enabled');
          setLoading(false);
          setTimeout(() => {
            navigate('/login', { replace: true });
          }, 2000);
          return;
        }

        const token = searchParams.get('token');
        const errorParam = searchParams.get('error') || searchParams.get('oauthError');

        // Handle error from OAuth provider
        if (errorParam) {
          setError(decodeURIComponent(errorParam));
          setLoading(false);
          setTimeout(() => {
            navigate('/login?error=' + encodeURIComponent(decodeURIComponent(errorParam)), { replace: true });
          }, 3000);
          return;
        }

        // Validate token exists
        if (!token) {
          setError('No authentication token received');
          setLoading(false);
          setTimeout(() => {
            navigate('/login', { replace: true });
          }, 3000);
          return;
        }

        // Verify token and get user info
        try {
          const response = await apiClient.get<{ user: import('@/types/api').User }>('/me', {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          // Save to authStore
          login({
            user: response.data.user,
            token: token,
          });

          // Redirect to dashboard
          navigate('/dashboard', { replace: true });
        } catch (err: any) {
          setError('Failed to verify authentication token');
          setLoading(false);
          setTimeout(() => {
            navigate('/login', { replace: true });
          }, 3000);
        }
      } catch (err: any) {
        setError('An error occurred during authentication');
        setLoading(false);
        setTimeout(() => {
          navigate('/login', { replace: true });
        }, 3000);
      }
    };

    handleCallback();
  }, [searchParams, navigate, login]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Completing sign in...</CardTitle>
            <CardDescription>Please wait while we finish setting up your account</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Sign in failed</CardTitle>
          <CardDescription>{error || 'An unknown error occurred'}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 text-center">
            Redirecting to login page...
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

