'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[HRISPH Global Error]', error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#fff', color: '#111' }}>
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center' }}>
          <div style={{ maxWidth: '480px' }}>
            <p style={{ fontSize: '5rem', fontWeight: 900, color: '#ce1126', margin: '0 0 1rem' }}>500</p>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 0.75rem' }}>
              A critical error occurred
            </h1>
            <p style={{ color: '#666', margin: '0 0 2rem', lineHeight: 1.6 }}>
              We&apos;re sorry — something went seriously wrong. Please refresh the page or contact
              support at{' '}
              <a href="mailto:support@hrisph.com" style={{ color: '#0038a8' }}>
                support@hrisph.com
              </a>
              .
            </p>
            {error.digest && (
              <p style={{ fontSize: '0.75rem', color: '#999', fontFamily: 'monospace', margin: '0 0 1.5rem' }}>
                Error ID: {error.digest}
              </p>
            )}
            <button
              onClick={reset}
              style={{
                padding: '0.625rem 1.5rem',
                borderRadius: '0.5rem',
                background: '#0038a8',
                color: '#fff',
                border: 'none',
                fontSize: '0.875rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Try Again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
