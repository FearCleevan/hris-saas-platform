'use client';

import { useEffect } from 'react';
import { Container } from '@/components/layout/Container';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[HRISPH Error]', error);
  }, [error]);

  return (
    <div className="pt-16 min-h-[calc(100vh-64px)] flex items-center">
      <Container className="py-24 text-center max-w-2xl">
        <p className="text-8xl font-black text-[#ce1126] mb-4">500</p>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground mb-3">
          Something went wrong
        </h1>
        <p className="text-muted-foreground mb-8 max-w-md mx-auto">
          An unexpected error occurred. Our team has been notified. Please try again or contact
          support if the problem persists.
        </p>
        {error.digest && (
          <p className="text-xs text-muted-foreground mb-6 font-mono">
            Error ID: {error.digest}
          </p>
        )}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center h-11 px-6 rounded-lg bg-[#0038a8] text-white font-semibold hover:bg-[#002580] transition-colors"
          >
            Try Again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center h-11 px-6 rounded-lg border border-border text-foreground font-semibold hover:bg-muted transition-colors"
          >
            Back to Homepage
          </a>
        </div>
      </Container>
    </div>
  );
}
