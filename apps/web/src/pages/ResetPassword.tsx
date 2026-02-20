import { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { resetPassword } from '../api/auth';
import { ApiError } from '../api/client';

export function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

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
      await resetPassword(token, password);
      setSuccess(true);
      // Redirect to login after 3 seconds
      setTimeout(() => navigate('/login'), 3000);
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

  if (!token) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="max-w-[440px] w-full text-center">
          <span className="material-symbols-outlined text-red-400 !text-4xl mb-4 block">error</span>
          <h1 className="font-display text-2xl font-light text-text-main mb-4">
            Invalid Reset Link
          </h1>
          <p className="text-sm text-text-muted font-light mb-6">
            This password reset link is invalid or has expired.
          </p>
          <Link
            to="/forgot-password"
            className="text-brand-gold hover:text-champagne-gold transition-colors font-medium text-sm"
          >
            Request a new reset link
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="max-w-[440px] w-full">
        <div className="text-center mb-12">
          <h1 className="font-display text-4xl md:text-5xl font-light text-text-main mb-4">
            New <span className="italic">Password</span>
          </h1>
          <p className="text-sm text-text-muted font-light">
            Choose a new password for your account.
          </p>
        </div>

        {success ? (
          <div className="bg-white rounded-2xl shadow-soft border border-border-light p-8 md:p-10 text-center">
            <span className="material-symbols-outlined text-green-500 !text-4xl mb-4 block">
              check_circle
            </span>
            <h2 className="text-lg font-medium mb-2">Password Updated</h2>
            <p className="text-sm text-text-muted font-light mb-6">
              Your password has been reset. Redirecting to sign in...
            </p>
            <Link
              to="/login"
              className="text-brand-gold hover:text-champagne-gold transition-colors font-medium text-sm"
            >
              Sign in now
            </Link>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-2xl shadow-soft border border-border-light p-8 md:p-10"
          >
            <div className="space-y-6">
              <div>
                <label
                  htmlFor="password"
                  className="block text-[10px] font-bold uppercase tracking-[0.2em] text-text-muted mb-2"
                >
                  New Password
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
                  Confirm New Password
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
                    <span className="material-symbols-outlined animate-spin !text-sm">
                      progress_activity
                    </span>
                    Resetting...
                  </>
                ) : (
                  'Set New Password'
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
