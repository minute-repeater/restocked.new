import { useState } from 'react';
import { Link } from 'react-router-dom';
import { forgotPassword } from '../api/auth';

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await forgotPassword(email);
    } catch {
      // Always show success — don't reveal if email exists
    } finally {
      setIsLoading(false);
      setSubmitted(true);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="max-w-[440px] w-full">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="font-display text-4xl md:text-5xl font-light text-text-main mb-4">
            Reset Your <span className="italic">Password</span>
          </h1>
          <p className="text-sm text-text-muted font-light">
            Enter your email and we'll send you a link to reset your password.
          </p>
        </div>

        {submitted ? (
          <div className="bg-white rounded-2xl shadow-soft border border-border-light p-8 md:p-10 text-center">
            <span className="material-symbols-outlined text-champagne-gold !text-4xl mb-4 block">
              mark_email_read
            </span>
            <h2 className="text-lg font-medium mb-2">Check your email</h2>
            <p className="text-sm text-text-muted font-light mb-6">
              If an account with that email exists, we've sent a password reset link.
            </p>
            <Link
              to="/login"
              className="text-brand-gold hover:text-champagne-gold transition-colors font-medium text-sm"
            >
              Back to sign in
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
                    Sending...
                  </>
                ) : (
                  'Send Reset Link'
                )}
              </button>
            </div>
          </form>
        )}

        <p className="mt-8 text-center text-xs text-text-muted font-light">
          Remember your password?{' '}
          <Link
            to="/login"
            className="text-brand-gold hover:text-champagne-gold transition-colors font-medium"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
