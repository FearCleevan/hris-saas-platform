'use client';

import { useState } from 'react';
import { Loader2, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/FormField';
import { Label } from '@/components/ui/label';
import { createClient } from '@/lib/supabase/client';

const COMPANY_SIZES = ['1-10', '11-50', '51-200', '201-500', '500+'];

const ADMIN_URL =
  process.env.NEXT_PUBLIC_ADMIN_URL ?? 'https://adminhrisph.vercel.app';

export function SignupForm() {
  const [loading, setLoading] = useState(false);
  const [companySize, setCompanySize] = useState('');
  const [error, setError] = useState('');
  const [emailSent, setEmailSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const form = e.currentTarget;
    const data = new FormData(form);

    const firstName   = data.get('firstName')  as string;
    const lastName    = data.get('lastName')   as string;
    const email       = data.get('email')      as string;
    const company     = data.get('company')    as string;
    const password    = data.get('password')   as string;

    const supabase = createClient();

    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // These go into auth.users.raw_user_meta_data
        // The handle_new_user trigger reads them to create org + profile
        data: {
          first_name:   firstName,
          last_name:    lastName,
          company_name: company,
          company_size: companySize,
        },
        // After email confirmation, Supabase redirects here
        // Our /auth/callback route then redirects to admin dashboard
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/setup-company`,
      },
    });

    if (authError) {
      setError(
        authError.message.includes('already registered')
          ? 'An account with this email already exists. Please sign in instead.'
          : authError.message
      );
      setLoading(false);
      return;
    }

    // Supabase sends a confirmation email.
    // If email confirmations are disabled in the Supabase dashboard,
    // the user is immediately signed in — redirect to admin dashboard.
    const { data: sessionData } = await supabase.auth.getSession();

    if (sessionData.session) {
      // No email confirmation required — go straight to setup
      window.location.href = `${ADMIN_URL}/setup-company`;
    } else {
      // Email confirmation required — show "check your email" state
      setEmailSent(true);
      setLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-2xl p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-green-500/15 flex items-center justify-center mx-auto mb-3">
          <span className="text-2xl">📧</span>
        </div>
        <h3 className="font-bold text-foreground mb-1">Check your email</h3>
        <p className="text-sm text-muted-foreground">
          We sent a confirmation link to your work email. Click it to activate your 14-day free trial and start setting up your company.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <FormField id="firstName" name="firstName" label="First Name" required placeholder="Juan" autoComplete="given-name" />
        <FormField id="lastName"  name="lastName"  label="Last Name"  required placeholder="dela Cruz" autoComplete="family-name" />
      </div>

      <FormField
        id="email"
        name="email"
        label="Work Email"
        type="email"
        required
        placeholder="juan@company.com"
        autoComplete="email"
      />

      <FormField
        id="company"
        name="company"
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
        name="password"
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
