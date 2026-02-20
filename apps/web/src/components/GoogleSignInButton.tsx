import { useEffect, useRef, useCallback } from 'react';

interface GoogleSignInButtonProps {
  onSuccess: (idToken: string) => void;
  onError: (error: string) => void;
  disabled?: boolean;
}

export function GoogleSignInButton({ onSuccess, onError, disabled }: GoogleSignInButtonProps) {
  const buttonRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);

  const handleCallback = useCallback(
    (response: { credential?: string }) => {
      if (response.credential) {
        onSuccess(response.credential);
      } else {
        onError('Google sign-in failed');
      }
    },
    [onSuccess, onError]
  );

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId || initialized.current) return;

    // Wait for GSI script to load
    const tryInit = () => {
      if (!window.google?.accounts?.id || !buttonRef.current) return false;

      google.accounts.id.initialize({
        client_id: clientId,
        callback: handleCallback,
      });

      google.accounts.id.renderButton(buttonRef.current, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        width: 360,
        text: 'signin_with',
        shape: 'pill',
      });

      initialized.current = true;
      return true;
    };

    if (!tryInit()) {
      // Script not loaded yet — poll briefly
      const interval = setInterval(() => {
        if (tryInit()) clearInterval(interval);
      }, 100);
      // Stop after 5 seconds
      setTimeout(() => clearInterval(interval), 5000);
      return () => clearInterval(interval);
    }
  }, [handleCallback]);

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  if (!clientId) return null;

  return (
    <div
      ref={buttonRef}
      className={disabled ? 'opacity-50 pointer-events-none' : ''}
    />
  );
}
