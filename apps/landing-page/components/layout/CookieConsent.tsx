'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';

const CONSENT_KEY = 'hrisph_cookie_consent';

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(CONSENT_KEY);
    if (!stored) setVisible(true);
  }, []);

  const accept = () => {
    localStorage.setItem(CONSENT_KEY, 'accepted');
    setVisible(false);
  };

  const decline = () => {
    localStorage.setItem(CONSENT_KEY, 'declined');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Cookie consent"
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-sm z-50 bg-card border border-border rounded-2xl shadow-lg p-5"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <p className="text-sm font-semibold text-foreground">🍪 Cookie Notice</p>
        <button
          onClick={decline}
          aria-label="Dismiss cookie notice"
          className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed mb-4">
        We use cookies to improve your experience and analyze site usage, in compliance with the{' '}
        <Link href="/privacy-policy" className="text-[#0038a8] dark:text-blue-400 hover:underline">
          Data Privacy Act (RA 10173)
        </Link>
        . You can manage your preferences at any time.
      </p>
      <div className="flex gap-2">
        <button
          onClick={accept}
          className="flex-1 h-9 rounded-lg bg-[#0038a8] text-white text-xs font-semibold hover:bg-[#002580] transition-colors"
        >
          Accept All
        </button>
        <button
          onClick={decline}
          className="flex-1 h-9 rounded-lg border border-border text-foreground text-xs font-semibold hover:bg-muted transition-colors"
        >
          Decline
        </button>
      </div>
    </div>
  );
}
