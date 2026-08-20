# HRIS SaaS Platform — Status Report

**Generated:** 2026-08-20
**Scope:** Full audit of every app, package, and backend module in this monorepo, verified against actual source (not planning docs), plus a check of git history and uncommitted working-tree state.

---

## 1. Executive summary

This is a Philippines-market, multi-tenant HRIS/payroll SaaS platform built as a Turborepo monorepo. Active development ran in two bursts: a concentrated ~3.5-week build (2026-04-21 → 2026-05-14, 31 commits) that stood up the landing page, the admin dashboard's UI shell across 14 feature domains, AI features, and a Supabase backend with 89 tables — followed by a **~3-month gap with no commits**, during which a bug-fix pass on the landing page was started and left **uncommitted**.

The platform is further along than the last recorded project memory suggested (that memory was 120 days stale and wrong about 3 of 4 major components). The backend is the most mature layer. The weakest link is that most of the admin dashboard's *business logic* — the actual HR/payroll features that are the product's value — is still running on mock JSON, not the live database.

**Single biggest risk right now:** an open-redirect security bug and a PDPA/RA 10173 consent-ordering bug are fixed in the working tree but **not committed**, and have been sitting that way for roughly three months. This is a landing-page-facing legal/security exposure that should be closed first.

---

## 2. Component-by-component status

### `apps/landing-page` (Next.js) — Route-complete, mid-fix, uncommitted
- All 21 originally-planned routes exist and render.
- Real Supabase-backed lead capture: `demo_requests`, `contact_messages`, `newsletter_subscribers` tables + matching Edge Functions (`submit-demo-request`, `submit-contact-form`, `subscribe-newsletter`, `unsubscribe-newsletter`), all rate-limited.
- A self-audit (`FIX-PLAN.md`, `FIXES.md`) found:
  - **Critical:** open redirect in `app/auth/callback/route.ts`.
  - **Critical:** analytics (`Analytics.tsx`) fires before cookie consent is given (RA 10173 exposure).
  - **High:** demo/contact forms were previously fake — now wired, per the untracked `app/api/` handlers.
  - **High:** dead Google OAuth button on login/signup.
  - **Medium/Low:** wrong savings-percentage math, signup race condition, inconsistent stats copy (₱2.4B+ vs ₱24B+), hidden feature categories, non-functional newsletter form.
- **12 files are modified and 5 are untracked in the working tree, none committed.** This is real, finished-looking work sitting at risk of loss.

### `apps/hris-admin-dashboard` (React 19 + Vite + MUI) — UI scaffolded, mostly mock-backed
- Stack: React Router 6, Zustand, TanStack Query, MUI + Radix, React Hook Form + Zod, Recharts, Gemini AI (`@google/generative-ai`).
- Per its own `WIRING_PHASES.md`: **Phase 1 (Auth & multi-tenant Organizations) is complete** — real Supabase auth, RPC-based org creation, tenant selector, RBAC route guards. **Phases 2–14 are marked "Not Started"** — Employee DB, Onboarding/Offboarding, Attendance, Leave, Payroll, Benefits/Loans, Expenses, Documents, Performance, Compliance & Reports, Recruitment, Notifications, Dashboard/Analytics/Audit.
- In practice, code is ahead of that doc: hooks/services for Employees, Leaves, Attendance, Onboarding, and Offboarding already exist and follow a `isSupabaseConfigured` mock-fallback pattern (found in 25 files) — but the doc's own phase table hasn't been updated, so the true wiring completion percentage is unclear without a page-by-page check.
- 14 feature domains have working UI shells backed by ~40 mock JSON fixtures.
- `supabase-rls-fix.sql` (409 lines) defines the RLS policies for the core tables and is flagged in the deploy doc as a **manual step required** in the Supabase SQL editor — easy to forget when standing up a new environment.
- `dist/` + `vercel.json` indicate at least one production build/deploy has happened.
- Zero `TODO`/`FIXME`/debug `console.log` found — the code itself is clean; the gap is architectural completeness, not code quality.

### `apps/employee-portal-web` (React + Vite) — Frontend built, zero backend
- All core employee self-service pages exist: dashboard, attendance, leaves, payslip, expenses, documents, performance, benefits, notifications, settings, profile, plus auth screens.
- Real routing, layouts, Zustand auth store, shadcn-style UI kit — not a leftover Vite template.
- **No Supabase client, no API layer, no env vars beyond an app title.** This app cannot talk to the backend yet, even though the backend already has the tables it would need (most of them shared with the admin dashboard's schema).

### `apps/employee-portal-mobile` — Not started
Only a `.gitkeep`. Spec calls for React Native + Expo (SDK 50+), biometric auth, GPS/geofenced clock-in, offline sync — the largest single remaining scope item after superadmin.

### `apps/superadmin-dashboard` — Not started
Only a `.gitkeep`. Spec requires this for the business itself to operate: MRR/ARR/churn dashboards, tenant impersonation, Stripe **and** PayMongo billing (GCash/Maya/GrabPay + 12% VAT), support ticketing, DPA compliance tooling. **Without this app, the platform has no way to bill customers.**

### `backend/supabase` — Most mature layer
- 20 migrations, 89 tables, covering essentially every business domain in the spec (orgs/auth, employees, onboarding/offboarding, attendance, leave, payroll, benefits, expenses, documents, performance, compliance, recruitment, notifications, audit, analytics, storage).
- Payroll migration explicitly targets "PH-compliant, TRAIN/SSS/PhilHealth/HDMF 2024" — statutory correctness was clearly a priority.
- 5 deployed Edge Functions, a `custom_access_token_hook` for JWT-embedded `org_id`/`user_role`, TOTP 2FA configured, storage buckets provisioned.
- Per its own `DEPLOY.md` phase table: Phase 1 (Foundation & Auth) done; Phases 2–6 (Leads/Email/CMS/Analytics/Integration testing) pending — largely superseded by what landing-page and hris-admin-dashboard have since built directly.
- `modules/` (meant to hold shared business logic reusable across apps: `hris-core`, `employee-portal`, `landing-page`, `superadmin`) is completely empty — every app has instead been calling Supabase directly from its own service layer. This works today but means payroll/compliance logic will likely get duplicated once employee-portal-web and mobile are wired up.

### `packages/shared-types`, `packages/shared-utils` — Complete
Real TypeScript types (Employee, Payroll, Organization) and real, cited PH statutory calculations: 2024 SSS contribution brackets (with MPF), PhilHealth premium, Pag-IBIG (Circular 274), BIR TRAIN Law withholding, Labor Code overtime/holiday multipliers, and hardcoded PH holiday calendars. This is genuinely finished, production-quality utility code.

### `packages/ui-components` — Stub, and the monorepo isn't using it
`src/index.ts` is `export {};`. Every frontend app has instead built its own MUI/shadcn-based components independently. This directly contradicts the monorepo's stated design intent (share UI via `packages/ui-components`) and means visual/behavioral drift between admin dashboard and employee portal is already happening.

### `packages/supabase-client` — Types never regenerated
Browser/server clients are built correctly, but `database.types.ts` is still the placeholder stub with a comment telling the developer to run `supabase gen types typescript --local`. Given there are now 89 real tables, every app importing this package is working without real DB type safety — a correctness risk that's cheap to fix.

---

## 3. Cross-cutting risks

1. **Nested-repo git hygiene issue.** `hris-saas-platform/` is a full git repository (own GitHub remote: `FearCleevan/hris-saas-platform`) sitting *inside* the outer `my-first-saas` repo without being registered as a proper submodule (no `.gitmodules`). The outer repo just sees it as one opaque modified path (`M hris-saas-platform`). This is a common trap: an outer `git add -A` can silently misbehave around it, and there's no enforced link between the two histories. Low urgency, but worth deciding: promote to a real submodule, or move the outer prompt-library docs elsewhere and treat `hris-saas-platform` as the one true repo.
2. **~3 months of uncommitted work.** The landing-page fix pass has been sitting in the working tree since roughly 2026-05-30. Any local disk issue between now and committing loses real, apparently-finished work, including a security fix.
3. **Doc/code drift.** `WIRING_PHASES.md` in the admin dashboard understates actual progress. If future sessions (or teammates) trust the doc over the code, they may re-do work that already exists, or miss that "Phase 2" is partially live.
4. **AI provider inconsistency across planning docs** — the admin dashboard's AI features are actually built on Google Gemini, but the backend planning docs for hris-core and superadmin both say "OpenAI/Claude" for their AI/analytics phases. Needs a decision before those backend phases are built, so the tenant-facing and platform-facing AI stacks don't diverge for no reason.
5. **No monetization path yet.** Without `superadmin-dashboard`, there is no billing, no plan enforcement, no way to actually run this as a business today, even though the core product (admin dashboard) has a working MVP shell.

---

## 4. Recommended immediate next actions, in order

1. **Commit the landing-page security fixes now.** This is the only item on this list with real legal/security exposure sitting exposed.
2. **Regenerate `packages/supabase-client/src/database.types.ts`** from the live schema (`supabase gen types typescript --local` or against the linked project) — unlocks real type safety everywhere, is close to a 5-minute task, and de-risks everything built on top of it.
3. **Reconcile `WIRING_PHASES.md` with actual code** in hris-admin-dashboard so the next session has an accurate picture of what's really wired vs. mock.
4. **Pick one admin-dashboard domain and finish it end-to-end on real data** (Payroll is explicitly flagged in the original spec as "CRITICAL — MOST IMPORTANT PHASE," so it's the highest-value candidate) rather than spreading effort thin across all 13 remaining domains.
5. **Wire `employee-portal-web` to Supabase**, reusing the exact patterns already proven in the admin dashboard (`isSupabaseConfigured`, service/hook layering) — this app's frontend is otherwise ready and is currently the cheapest large unlock in the whole codebase.
