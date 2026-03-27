import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { login as loginApi, googleAuth } from '../api/auth';
import { ApiError } from '../api/client';
import { GoogleSignInButton } from '../components/GoogleSignInButton';
import { SEO } from '../components/SEO';

export function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const { token, user } = await loginApi(email, password);
      login(token, user);
      navigate('/dashboard');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSuccess = async (idToken: string) => {
    setError('');
    setIsLoading(true);
    try {
      const { token, user } = await googleAuth(idToken);
      login(token, user);
      navigate('/dashboard');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Google sign-in failed');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <SEO
        title="Sign In"
        description="Sign in to your Covet account to manage your tracked items and alerts."
        path="/login"
        noindex
      />
      <div className="max-w-[440px] w-full">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="font-display text-4xl md:text-5xl font-light text-text-main mb-4">
            Welcome <span className="italic">Back</span>
          </h1>
          <p className="text-sm text-text-muted font-light">
            Sign in to access your curated watchlist.
          </p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl shadow-soft border border-border-light p-8 md:p-10"
        >
          <div className="space-y-6">
            <div>
              <label
                htmlFor="email"
                className="block text-[10px] font-bold uppercase tracking-[0.2em] text-text-muted mb-2"
              >
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full px-4 py-3.5 border border-border-light rounded-xl text-sm font-light focus:ring-2 focus:ring-brand-gold/10 focus:border-brand-gold/40 transition-all placeholder:text-stone-300"
                disabled={isLoading}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label
                  htmlFor="password"
                  className="block text-[10px] font-bold uppercase tracking-[0.2em] text-text-muted"
                >
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-[10px] uppercase tracking-[0.15em] text-brand-gold hover:text-champagne-gold transition-colors font-medium"
                >
                  Forgot?
                </Link>
              </div>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Enter your password"
                className="w-full px-4 py-3.5 border border-border-light rounded-xl text-sm font-light focus:ring-2 focus:ring-brand-gold/10 focus:border-brand-gold/40 transition-all placeholder:text-stone-300"
                disabled={isLoading}
              />
            </div>

            {error && (
              <div className="flex items-center gap-3 text-sm text-red-600 bg-red-50 px-4 py-3 rounded-xl">
                <span className="material-symbols-outlined !text-lg">error</span>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="group w-full bg-text-main text-white py-4 rounded-full text-[10px] font-bold uppercase tracking-[0.25em] hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3"
            >
              {isLoading ? (
                <>
                  <span className="material-symbols-outlined animate-spin !text-sm">progress_activity</span>
                  Signing In...
                </>
              ) : (
                <>
                  Sign In
                  <span className="material-symbols-outlined !text-sm transition-transform group-hover:translate-x-1">arrow_right_alt</span>
                </>
              )}
            </button>

            {/* Divider */}
            <div className="flex items-center gap-4">
              <div className="h-px flex-1 bg-border-light" />
              <span className="text-[9px] uppercase tracking-[0.2em] text-stone-300">or</span>
              <div className="h-px flex-1 bg-border-light" />
            </div>

            {/* Google Sign In */}
            <div className="flex justify-center">
              <GoogleSignInButton
                onSuccess={handleGoogleSuccess}
                onError={(msg) => setError(msg)}
                disabled={isLoading}
              />
            </div>
          </div>
        </form>

        {/* Footer */}
        <p className="mt-8 text-center text-xs text-text-muted font-light">
          Don't have an account?{' '}
          <Link
            to="/register"
            className="text-brand-gold hover:text-champagne-gold transition-colors font-medium"
          >
            Create one
          </Link>
        </p>

        <div className="mt-6 flex items-center justify-center gap-3">
          <div className="h-px w-12 bg-border-light" />
          <span className="text-[9px] uppercase tracking-[0.3em] text-stone-300">Secure & Encrypted</span>
          <div className="h-px w-12 bg-border-light" />
        </div>
      </div>
    </div>
  );
}
