'use client';

import { useState } from 'react';

export function NewsletterForm() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <p className="text-sm text-green-600 dark:text-green-400 font-medium">
        You&apos;re subscribed! We&apos;ll notify you of new compliance updates.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-sm mx-auto">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="juan@company.com"
        required
        className="flex-1 h-10 px-4 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#0038a8]/30"
      />
      <button
        type="submit"
        className="h-10 px-5 rounded-lg bg-[#0038a8] text-white text-sm font-semibold hover:bg-[#002580] transition-colors whitespace-nowrap"
      >
        Subscribe
      </button>
    </form>
  );
}
