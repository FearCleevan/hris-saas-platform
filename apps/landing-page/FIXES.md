# Landing Page — Fixes & Improvements

> Reviewed: 2026-05-30  
> Scope: Full codebase audit (functions, logic, design, security)  
> Priority order: ship-blocking → broken features → logic/data bugs → UX

---

## Table of Contents

1. [CRITICAL — Open Redirect in Auth Callback](#1-critical--open-redirect-in-auth-callback)
2. [CRITICAL — Analytics Fires Before Cookie Consent](#2-critical--analytics-fires-before-cookie-consent)
3. [HIGH — Demo & Contact Forms Are Fake (Data Loss)](#3-high--demo--contact-forms-are-fake-data-loss)
4. [HIGH — Google Sign-In Button Does Nothing](#4-high--google-sign-in-button-does-nothing)
5. [MEDIUM — Annual Savings Calculation Is Wrong](#5-medium--annual-savings-calculation-is-wrong)
6. [MEDIUM — Signup Race Condition on Session Check](#6-medium--signup-race-condition-on-session-check)
7. [MEDIUM — Inconsistent Payroll Stats Between Sections](#7-medium--inconsistent-payroll-stats-between-sections)
8. [LOW — Feature Filter Silently Drops Two Categories](#8-low--feature-filter-silently-drops-two-categories)
9. [LOW — Newsletter Form Doesn't Subscribe Anyone](#9-low--newsletter-form-doesnt-subscribe-anyone)
10. [LOW — Loading State Not Reset After Login Success](#10-low--loading-state-not-reset-after-login-success)

---

## 1. CRITICAL — Open Redirect in Auth Callback

**File:** `app/auth/callback/route.ts` — line 19  
**Type:** Security vulnerability

### Problem

The `next` query parameter is interpolated directly into the redirect URL without any validation:

```ts
// CURRENT — UNSAFE
const next = searchParams.get('next') ?? '/';
return NextResponse.redirect(`${adminUrl}${next}`);
```

An attacker can craft:
```
/auth/callback?code=VALID_CODE&next=//evil.com/phishing-page
```
After a legitimate Supabase email confirmation, the user gets redirected to `evil.com`. This is a classic **open redirect** that can be used for phishing after a real auth flow.

### Fix

Validate that `next` is a safe relative path before using it:

```ts
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const rawNext = searchParams.get('next') ?? '/';

  // Only allow relative paths — no protocol, no double-slash
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const adminUrl = process.env.NEXT_PUBLIC_ADMIN_URL ?? 'https://adminhrisph.vercel.app';
      return NextResponse.redirect(`${adminUrl}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
```

---

## 2. CRITICAL — Analytics Fires Before Cookie Consent

**File:** `app/layout.tsx` — line 138, `components/Analytics.tsx`  
**Type:** Legal / PDPA (RA 10173) violation

### Problem

`<Analytics />` is rendered unconditionally in the root layout — outside of any consent gate — so GA4 and Meta Pixel scripts load immediately for every visitor on first page load. The `CookieConsent` banner (which explicitly mentions RA 10173 compliance) is shown *after* the tracking already started.

```tsx
// CURRENT — layout.tsx
<Analytics />  {/* fires unconditionally */}
...
<CookieConsent />  {/* shown after scripts already ran */}
```

### Fix

**Step 1** — Create a consent-aware analytics wrapper that reads localStorage before rendering:

```tsx
// components/Analytics.tsx
'use client';

import { useEffect, useState } from 'react';
import Script from 'next/script';

const GA4_ID = process.env.NEXT_PUBLIC_GA4_ID;
const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;
const CONSENT_KEY = 'hrisph_cookie_consent';

export function Analytics() {
  const [consented, setConsented] = useState(false);

  useEffect(() => {
    const check = () => {
      if (localStorage.getItem(CONSENT_KEY) === 'accepted') {
        setConsented(true);
      }
    };
    check();
    window.addEventListener('hrisph_consent_accepted', check);
    return () => window.removeEventListener('hrisph_consent_accepted', check);
  }, []);

  if (!consented || (!GA4_ID && !META_PIXEL_ID)) return null;

  return (
    <>
      {GA4_ID && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`} strategy="afterInteractive" />
          <Script id="ga4-init" strategy="afterInteractive">{`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA4_ID}', { page_path: window.location.pathname });
          `}</Script>
        </>
      )}
      {META_PIXEL_ID && (
        <Script id="meta-pixel" strategy="afterInteractive">{`
          !function(f,b,e,v,n,t,s){if(f.fbq)return;...}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '${META_PIXEL_ID}');
          fbq('track', 'PageView');
        `}</Script>
      )}
    </>
  );
}
```

**Step 2** — Dispatch the event from `CookieConsent` when the user accepts:

```ts
// components/layout/CookieConsent.tsx
const accept = () => {
  localStorage.setItem(CONSENT_KEY, 'accepted');
  window.dispatchEvent(new Event('hrisph_consent_accepted'));
  setVisible(false);
};
```

---

## 3. HIGH — Demo & Contact Forms Are Fake (Data Loss)

**Files:** `components/sections/DemoModal.tsx` — line 47–57, `app/contact/ContactForm.tsx` — line 35–43  
**Type:** Broken feature / data loss

### Problem

Both forms simulate a submission with a fake delay and `console.log` — no data is sent or saved anywhere. Users who fill out a demo request or contact form get a success toast, but the leads are silently lost.

```ts
// CURRENT — DemoModal.tsx & ContactForm.tsx
const onSubmit = async (data: DemoFormData) => {
  setSubmitting(true);
  await new Promise((r) => setTimeout(r, 1400)); // fake delay
  console.log('[Demo Request Submitted]', data);  // goes nowhere
  setSubmitting(false);
  setStep('success');
};
```

### Fix

Wire up a real API route. Example using a Next.js Route Handler + email (e.g. Resend) or a CRM webhook:

```ts
// app/api/demo-request/route.ts
import { NextResponse } from 'next/server';
import { demoFormSchema } from '@/lib/demo-schema';

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = demoFormSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
  }

  // Option A: send email via Resend
  // Option B: insert row into Supabase `demo_requests` table
  // Option C: POST to CRM webhook (HubSpot, Pipedrive, etc.)

  return NextResponse.json({ success: true });
}
```

Then update `onSubmit` in `DemoModal.tsx`:

```ts
const onSubmit = async (data: DemoFormData) => {
  setSubmitting(true);
  try {
    const res = await fetch('/api/demo-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Submission failed');
    setStep('success');
    toast.success('Demo request received!', {
      description: `We'll confirm your slot for ${data.preferredDate} at ${data.preferredTime} PHT.`,
    });
  } catch {
    toast.error('Something went wrong. Please try again.');
  } finally {
    setSubmitting(false);
  }
};
```

Apply the same pattern to `ContactForm.tsx` with a `/api/contact` route.

---

## 4. HIGH — Google Sign-In Button Does Nothing

**File:** `app/login/LoginForm.tsx` — line 123  
**Type:** Broken feature

### Problem

The "Continue with Google" button has no `onClick` handler. Clicking it silently does nothing — no OAuth flow, no error, no feedback.

```tsx
// CURRENT — broken button
<Button type="button" variant="outline" className="w-full h-11 gap-2" disabled={loading}>
  {/* Google SVG */}
  Continue with Google
</Button>
```

### Fix

**Option A — Wire up Supabase Google OAuth (recommended):**

```tsx
const handleGoogleSignIn = async () => {
  setLoading(true);
  const supabase = createClient();
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });
  if (error) {
    setError(error.message);
    setLoading(false);
  }
  // On success, Supabase handles the redirect automatically
};

// In JSX:
<Button
  type="button"
  variant="outline"
  className="w-full h-11 gap-2"
  disabled={loading}
  onClick={handleGoogleSignIn}
>
  {/* Google SVG */}
  Continue with Google
</Button>
```

**Option B** — Remove the button entirely until OAuth is ready rather than showing a non-functional UI element.

> Note: Make sure Google OAuth is enabled in your Supabase project under Authentication → Providers.

---

## 5. MEDIUM — Annual Savings Calculation Is Wrong

**File:** `components/sections/PricingSection.tsx` — line 157  
**Type:** Logic bug / misleads users

### Problem

Annual billing is marketed as **20% off**, but the savings display computes **25%** (`* 0.25`):

```tsx
// CURRENT — shows wrong savings amount
<div className="rounded-lg bg-green-500/10 ...">
  💰 You save {formatCurrency(Math.round(totalMonthly * 12 * 0.25))} per year vs monthly billing
</div>
```

If monthly total is ₱10,000, this shows "save ₱30,000/year" — but actual saving at 20% off is ₱24,000. The inflated number will be noticed by prospects who do the math.

### Fix

```tsx
// FIXED — correct 20% savings
💰 You save {formatCurrency(Math.round(totalMonthly * 12 * 0.20))} per year vs monthly billing
```

Or, derive it from the actual price difference between billing cycles to keep it DRY and always accurate:

```tsx
const monthlyCost = tier.monthlyPricePerEmployee * employees * 12;
const annualCost = tier.annualPricePerEmployee * employees * 12;
const actualSavings = monthlyCost - annualCost;

// In JSX:
💰 You save {formatCurrency(actualSavings)} per year vs monthly billing
```

---

## 6. MEDIUM — Signup Race Condition on Session Check

**File:** `app/signup/SignupForm.tsx` — line 68  
**Type:** Logic bug

### Problem

After calling `supabase.auth.signUp()`, the code makes a *second* async call to `supabase.auth.getSession()` to check if the user was immediately signed in (email confirmation disabled). This is a race: cookies may not be set yet, and `getSession()` can return `null` even when a session was just created.

```ts
// CURRENT — unnecessary second call, potential race
const { error: authError } = await supabase.auth.signUp({ ... });
// ...
const { data: sessionData } = await supabase.auth.getSession(); // race condition
if (sessionData.session) {
  window.location.href = `${ADMIN_URL}/setup-company`;
}
```

### Fix

The `signUp()` response already includes the session if email confirmation is disabled. Use it directly:

```ts
const { data: authData, error: authError } = await supabase.auth.signUp({
  email,
  password,
  options: { ... },
});

if (authError) {
  setError(/* ... */);
  setLoading(false);
  return;
}

// Session is present immediately when email confirmation is disabled
if (authData.session) {
  window.location.href = `${ADMIN_URL}/setup-company`;
} else {
  setEmailSent(true);
  setLoading(false);
}
```

---

## 7. MEDIUM — Inconsistent Payroll Stats Between Sections

**Files:** `components/sections/HeroSection.tsx` — line 22, `components/sections/TestimonialsSection.tsx` — line 52  
**Type:** Data/credibility bug

### Problem

The same metric ("Payroll Processed") shows two different numbers on the same page:

| Section | Value |
|---|---|
| `HeroSection` stats strip | `₱2.4B+` |
| `TestimonialsSection` stat cards | `₱24B+` (10× larger) |

A prospect who scrolls the full page will notice the contradiction and lose trust.

### Fix

**Step 1** — Decide on the canonical number (confirm with business/marketing).

**Step 2** — Extract stats to a shared data file so they can never diverge:

```ts
// data/stats.ts
export const PLATFORM_STATS = {
  companies: { value: 500, display: '500+', label: 'Philippine Companies' },
  employees: { value: 120_000, display: '120K+', label: 'Employees Managed' },
  payroll:   { value: 2.4, display: '₱2.4B+', label: 'Payroll Processed' },
  uptime:    { value: 99.9, display: '99.9%', label: 'Uptime SLA' },
} as const;
```

Import from `PLATFORM_STATS` in both `HeroSection` and `TestimonialsSection` instead of duplicating the values.

---

## 8. LOW — Feature Filter Silently Drops Two Categories

**File:** `components/sections/FeaturesSection.tsx` — line 347  
**Type:** UX bug

### Problem

`categories` has 7 items but only 5 are rendered due to a hard-coded `slice(0, 5)`:

```tsx
// CURRENT — hides 'Reports & Analytics' and 'Enterprise Features'
{categories.slice(0, 5).map((cat) => ( ... ))}
```

Users can never filter features by those two categories. This is likely a layout constraint that became a silent data exclusion.

### Fix

**Option A** — Remove the slice and let the filter bar wrap naturally:

```tsx
{categories.map((cat) => ( ... ))}
```

**Option B** — If layout space is tight, use a scrollable horizontal filter bar:

```tsx
<div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
  {categories.map((cat) => ( ... ))}
</div>
```

---

## 9. LOW — Newsletter Form Doesn't Subscribe Anyone

**File:** `app/blog/NewsletterForm.tsx`  
**Type:** Data loss / silent failure

### Problem

The form sets `submitted = true` and shows a success message without making any API call. Emails entered are permanently lost.

```ts
// CURRENT — no subscription happens
const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();
  if (!email) return; // also redundant since input is required
  setSubmitted(true); // just flips UI state
};
```

### Fix

Wire up a real newsletter service (Mailchimp, ConvertKit, Brevo, or a Supabase table):

```ts
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!email) return;
  setLoading(true);
  try {
    const res = await fetch('/api/newsletter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    if (!res.ok) throw new Error();
    setSubmitted(true);
  } catch {
    setError('Failed to subscribe. Please try again.');
  } finally {
    setLoading(false);
  }
};
```

---

## 10. LOW — Loading State Not Reset After Login Success

**File:** `app/login/LoginForm.tsx` — line 46  
**Type:** Minor UX bug

### Problem

`setLoading(false)` is never called on the success path. `window.location.href` is set, but if the redirect is slow or the admin app is temporarily unreachable, the button stays in the spinning "Signing in…" state indefinitely.

```ts
// CURRENT — setLoading(false) missing on success
if (!authError) {
  window.location.href = `${ADMIN_URL}/`;
  // loading spinner never stops if redirect is slow
}
```

### Fix

```ts
if (!authError) {
  // Keep loading=true while navigating (good UX), but add a fallback timeout
  window.location.href = `${ADMIN_URL}/`;
  // Safety: reset after 8s in case redirect fails silently
  setTimeout(() => setLoading(false), 8000);
  return;
}
setLoading(false);
```

---

## Summary Table

| # | Severity | File | Issue | Fix Complexity |
|---|---|---|---|---|
| 1 | 🔴 CRITICAL | `app/auth/callback/route.ts` | Open redirect via `next` param | Simple — add path validation |
| 2 | 🔴 CRITICAL | `app/layout.tsx` + `Analytics.tsx` | Analytics fires before consent | Medium — add consent gate |
| 3 | 🟠 HIGH | `DemoModal.tsx` + `ContactForm.tsx` | Forms are mock-only, data lost | Medium — wire API routes |
| 4 | 🟠 HIGH | `app/login/LoginForm.tsx` | Google button has no handler | Simple — add `onClick` handler |
| 5 | 🟡 MEDIUM | `PricingSection.tsx` | Savings calc uses 25% not 20% | Trivial — change one constant |
| 6 | 🟡 MEDIUM | `app/signup/SignupForm.tsx` | Race condition on session check | Simple — use `signUp` response directly |
| 7 | 🟡 MEDIUM | `HeroSection` + `TestimonialsSection` | Payroll stat is 10× inconsistent | Simple — shared data file |
| 8 | 🔵 LOW | `FeaturesSection.tsx` | Category filter hides 2 categories | Trivial — remove `slice(0, 5)` |
| 9 | 🔵 LOW | `app/blog/NewsletterForm.tsx` | Newsletter submits nothing | Medium — wire API + service |
| 10 | 🔵 LOW | `app/login/LoginForm.tsx` | Loading state not reset on success | Trivial — add timeout fallback |
