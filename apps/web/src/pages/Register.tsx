import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { register as registerApi, googleAuth } from '../api/auth';
import { ApiError } from '../api/client';
import { GoogleSignInButton } from '../components/GoogleSignInButton';

export function Register() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [searchParams] = useSearchParams();

  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setIsLoading(true);

    try {
      const { token, user } = await registerApi(email, password);
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
      <div className="max-w-[440px] w-full">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="font-display text-4xl md:text-5xl font-light text-text-main mb-4">
            Begin Your <span className="italic">Journey</span>
          </h1>
          <p className="text-sm text-text-muted font-light">
            Create your account to start monitoring your desired pieces.
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
              <label
                htmlFor="password"
                className="block text-[10px] font-bold uppercase tracking-[0.2em] text-text-muted mb-2"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                placeholder="Minimum 8 characters"
                className="w-full px-4 py-3.5 border border-border-light rounded-xl text-sm font-light focus:ring-2 focus:ring-brand-gold/10 focus:border-brand-gold/40 transition-all placeholder:text-stone-300"
                disabled={isLoading}
              />
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-[10px] font-bold uppercase tracking-[0.2em] text-text-muted mb-2"
              >
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="Re-enter your password"
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
                  Creating Account...
                </>
              ) : (
                <>
                  Get Started Free
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
          Already have an account?{' '}
          <Link
            to="/login"
            className="text-brand-gold hover:text-champagne-gold transition-colors font-medium"
          >
            Sign in
          </Link>
        </p>

        <div className="mt-6 flex items-center justify-center gap-3">
          <div className="h-px w-12 bg-border-light" />
          <span className="text-[9px] uppercase tracking-[0.3em] text-stone-300">No Credit Card Required</span>
          <div className="h-px w-12 bg-border-light" />
        </div>
      </div>
    </div>
  );
}
