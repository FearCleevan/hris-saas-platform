# Landing Page — Fix Plan

> Created: 2026-05-30  
> Based on: `FIXES.md` full audit  
> Strategy: Ship-blocking first → Broken features → Logic bugs → Polish

---

## Execution Order

Fixes are grouped into 4 phases. Each phase is safe to complete independently. Do **not** skip Phase 1 — those two issues are live security/legal risks.

---

## Phase 1 — Ship-Blocking (Do Before Anything Else)

> These two issues can cause legal liability or security exploits in production right now. Fix before any marketing campaign or public traffic.

### Fix 1.1 — Patch Open Redirect in Auth Callback
- **File:** `app/auth/callback/route.ts`
- **Change:** Validate `next` param before injecting into redirect URL
- **Effort:** ~5 minutes
- **Risk:** None — purely additive guard

### Fix 1.2 — Gate Analytics Behind Cookie Consent
- **File:** `components/Analytics.tsx` + `components/layout/CookieConsent.tsx`
- **Change:** Analytics component reads `localStorage` for consent before loading scripts; `CookieConsent` dispatches an event on accept
- **Effort:** ~30 minutes
- **Risk:** Low — analytics stops firing for users who haven't accepted yet (correct behavior)

**Phase 1 done when:** Auth callback rejects `//evil.com` redirects. GA4/Pixel scripts only fire after "Accept All" is clicked.

---

## Phase 2 — Broken User-Facing Features

> These are visible to every visitor. A prospect clicking "Continue with Google" or submitting a demo request gets no result.

### Fix 2.1 — Wire Google OAuth to the Login Button
- **File:** `app/login/LoginForm.tsx`
- **Change:** Add `onClick` handler calling `supabase.auth.signInWithOAuth({ provider: 'google' })`
- **Prerequisite:** Google OAuth must be enabled in Supabase dashboard (Authentication → Providers → Google)
- **Effort:** ~15 minutes
- **Risk:** None if OAuth provider is already configured

### Fix 2.2 — Wire Demo Request Form to a Real Backend
- **File:** `components/sections/DemoModal.tsx` + new `app/api/demo-request/route.ts`
- **Change:** Replace `setTimeout` + `console.log` with a POST to `/api/demo-request`. Route saves to Supabase `demo_requests` table or sends email via Resend/SMTP
- **Effort:** ~1–2 hours (depends on chosen backend: Supabase table is fastest)
- **Risk:** Medium — needs a backend decision (Supabase table vs. email vs. CRM)

### Fix 2.3 — Wire Contact Form to a Real Backend
- **File:** `app/contact/ContactForm.tsx` + new `app/api/contact/route.ts`
- **Change:** Same pattern as Fix 2.2 — replace mock with POST to `/api/contact`
- **Effort:** ~30 minutes once Fix 2.2 pattern is established
- **Risk:** Low — same approach as demo form

**Phase 2 done when:** Clicking Google sign-in starts OAuth flow. Submitting demo/contact forms saves real data.

---

## Phase 3 — Logic & Data Bugs

> These are silent errors — no crashes, but wrong numbers and lost data.

### Fix 3.1 — Correct Annual Savings Calculation (5 min)
- **File:** `components/sections/PricingSection.tsx` line 157
- **Change:** `* 0.25` → `* 0.20` (or derive from actual price delta)
- **Effort:** 2 minutes

### Fix 3.2 — Fix Signup Session Check Race Condition (10 min)
- **File:** `app/signup/SignupForm.tsx`
- **Change:** Use `authData.session` from `signUp()` response instead of calling `getSession()` separately
- **Effort:** 10 minutes

### Fix 3.3 — Sync Inconsistent Payroll Stats (15 min)
- **Files:** `components/sections/HeroSection.tsx`, `components/sections/TestimonialsSection.tsx`
- **Change:** Extract stats to `data/stats.ts`, import in both sections
- **Effort:** 15 minutes

### Fix 3.4 — Wire Newsletter Subscription (30–60 min)
- **File:** `app/blog/NewsletterForm.tsx` + new `app/api/newsletter/route.ts`
- **Change:** Replace fake submit with real API call to newsletter service (Mailchimp / Brevo / Supabase table)
- **Effort:** 30–60 minutes

**Phase 3 done when:** Pricing shows accurate savings, signup flow reads session correctly, all stats match, newsletter emails are saved.

---

## Phase 4 — Polish & UX

> Minor issues that are easy to fix but low urgency.

### Fix 4.1 — Restore Hidden Feature Categories (5 min)
- **File:** `components/sections/FeaturesSection.tsx` line 347
- **Change:** Remove `slice(0, 5)` or switch to scrollable filter bar

### Fix 4.2 — Add Loading Fallback After Login Redirect (5 min)
- **File:** `app/login/LoginForm.tsx`
- **Change:** Add `setTimeout(() => setLoading(false), 8000)` as a safety reset after redirect

**Phase 4 done when:** All 7 feature categories are filterable. Login button doesn't spin forever on a slow redirect.

---

## Full Timeline Estimate

| Phase | Fixes | Estimated Time |
|---|---|---|
| Phase 1 — Ship-blocking | 1.1, 1.2 | ~35 minutes |
| Phase 2 — Broken features | 2.1, 2.2, 2.3 | ~2–3 hours |
| Phase 3 — Logic bugs | 3.1, 3.2, 3.3, 3.4 | ~1–2 hours |
| Phase 4 — Polish | 4.1, 4.2 | ~10 minutes |
| **Total** | **10 fixes** | **~4–6 hours** |

---

## Decision Needed Before Phase 2

Before wiring the demo/contact/newsletter forms, decide on the backend storage strategy:

| Option | Pros | Cons |
|---|---|---|
| **A — Supabase table** | Already in the stack, zero new deps | Need to create tables + RLS policies |
| **B — Email via Resend** | Instant notification, no DB needed | Needs Resend account + API key |
| **C — Both A + B** | Stored data + instant alert | Slightly more setup |

> Recommended: **Option C** — save to Supabase for CRM-like querying, and send an email notification to your sales inbox so you don't miss leads.

---

## Ready to Start?

> Reply **"yes, proceed"** and I will begin with **Phase 1** (the two critical fixes), commit the changes, and check in before moving to Phase 2.  
> Or specify a different phase or single fix to start with.
