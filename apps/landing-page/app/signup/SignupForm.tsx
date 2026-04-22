'use client';

import { useState } from 'react';
import { Loader2, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/FormField';
import { Label } from '@/components/ui/label';

const COMPANY_SIZES = ['1-10', '11-50', '51-200', '201-500', '500+'];

export function SignupForm() {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [companySize, setCompanySize] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1400));
    setLoading(false);
    setSubmitted(true);
    // Stub: in production this would call Supabase auth sign-up
  };

  if (submitted) {
    return (
      <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-2xl p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-green-500/15 flex items-center justify-center mx-auto mb-3">
          <span className="text-2xl">🎉</span>
        </div>
        <h3 className="font-bold text-foreground mb-1">Account created!</h3>
        <p className="text-sm text-muted-foreground">
          Check your email for a confirmation link to activate your 14-day free trial.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <FormField id="firstName" label="First Name" required placeholder="Juan" autoComplete="given-name" />
        <FormField id="lastName" label="Last Name" required placeholder="dela Cruz" autoComplete="family-name" />
      </div>

      <FormField
        id="email"
        label="Work Email"
        type="email"
        required
        placeholder="juan@company.com"
        autoComplete="email"
      />

      <FormField
        id="company"
        label="Company Name"
        required
        placeholder="ABC Corporation"
        autoComplete="organization"
      />

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="size" className="text-sm font-medium">
          Number of Employees <span className="text-[#ce1126]">*</span>
        </Label>
        <div className="relative">
          <select
            id="size"
            title="Number of employees"
            required
            value={companySize}
            onChange={(e) => setCompanySize(e.target.value)}
            className="h-10 w-full appearance-none pl-3 pr-8 rounded-md border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 transition-colors"
          >
            <option value="">Select company size</option>
            {COMPANY_SIZES.map((s) => (
              <option key={s} value={s}>{s} employees</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        </div>
      </div>

      <FormField
        id="password"
        label="Password"
        type="password"
        required
        placeholder="At least 8 characters"
        autoComplete="new-password"
      />

      <Button
        type="submit"
        disabled={loading || !companySize}
        className="w-full bg-[#0038a8] hover:bg-[#002580] text-white font-semibold h-11 mt-2"
      >
        {loading ? (
          <><Loader2 className="h-4 w-4 animate-spin" /> Creating account…</>
        ) : (
          'Start Free 14-Day Trial'
        )}
      </Button>

      <p className="text-xs text-muted-foreground text-center">
        No credit card required. Cancel anytime.
      </p>
    </form>
  );
}
