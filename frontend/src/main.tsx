import * as Sentry from '@sentry/react';
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'

// Initialize Sentry before React renders
const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    integrations: [
      Sentry.browserTracingIntegration(),
    ],
    // Performance Monitoring
    tracesSampleRate: 1.0, // Capture 100% of transactions for performance monitoring
    // Environment
    environment: import.meta.env.MODE, // 'development' or 'production'
    // Release tracking (optional, can be set via environment variable)
    release: import.meta.env.VITE_APP_VERSION || undefined,
    // Only send stack traces in production (not in dev)
    beforeSend(event, hint) {
      // In development, don't send to Sentry (just log to console)
      if (import.meta.env.DEV) {
        console.error('Sentry event (not sent in dev):', event);
        return null; // Don't send in dev
      }
      return event;
    },
  });
} else if (import.meta.env.PROD) {
  console.warn('Sentry DSN not configured. Error monitoring disabled.');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
