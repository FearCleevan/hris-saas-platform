# Case Study: Building a Philippines-Market HRIS SaaS Platform

**As of:** 2026-08-20

## The problem

Philippine payroll and HR compliance is genuinely hard to get right: SSS, PhilHealth, and Pag-IBIG each publish their own contribution brackets that change periodically; BIR's TRAIN Law withholding tables have their own logic; the Labor Code defines specific overtime, rest-day, and holiday-pay multipliers; and 13th-month pay, government remittance deadlines, and statutory report formats (BIR 2316, SSS R-3, Pag-IBIG MCRF, PhilHealth RF-1) are all non-negotiable, audited requirements. Getting any of this wrong isn't a UX bug — it's a compliance and legal problem for the customer.

Incumbent players already serve this market: **Sprout Solutions** is the largest homegrown platform (1,800+ clients) with deep local compliance automation and growing AI features; **PayrollHero** differentiates on time/attendance with facial-recognition clock-in, aimed at retail/food-service/field teams; HashMicro, HReasily, and Keka HR round out the competitive set with varying depth of local statutory support. The market is real and served, but not saturated — most competitors are strong in either payroll compliance *or* modern UX/AI, rarely both at once, and switching-cost-driven loyalty is low relative to the compliance burden of getting it wrong.

## The approach taken

Rather than a single monolithic app, the platform is architected as a **Turborepo monorepo** with four planned frontends sharing one Supabase backend and shared packages for types, statutory calculations, and (eventually) UI components:

- `landing-page` (Next.js) — public marketing/lead-gen site, the only App-Router/SEO-oriented app in the suite.
- `hris-admin-dashboard` (React + Vite) — the core product: the HR/payroll admin console.
- `employee-portal-web` (React + Vite) + `employee-portal-mobile` (planned, React Native/Expo) — employee self-service.
- `superadmin-dashboard` (planned) — the internal console the *business itself* uses to run the SaaS: billing, tenant management, churn analytics.

This mirrors a pattern common among vertical SaaS builders in regulated spaces: a shared statutory-calculation core (here, `packages/shared-utils`) that every customer-facing surface draws from, so a change to (say) the 2025 SSS bracket table only has to be made once. That package is, notably, the most complete and highest-quality part of the codebase today — every calculation (SSS with MPF, PhilHealth, Pag-IBIG Circular 274, BIR TRAIN withholding, Labor Code overtime multipliers, PH holiday calendars) is implemented with bracket tables and legal citations directly in comments, not left as a TODO.

The build itself was executed as a series of scoped, single-session "phase prompts" (kept in the repo root's `00-setup/` … `04-superadmin/` folders) — a deliberate choice to keep AI-assisted sessions focused and reviewable rather than attempting the whole platform in one continuous session.

## What got built, and how fast

In roughly **24 active development days** (2026-04-21 to 2026-05-14, verified via git history), the project produced:
- A fully-routed, SEO-complete marketing site with real Supabase-backed lead capture.
- A 14-module admin dashboard UI (employees, payroll, attendance, leave, benefits, expenses, documents, performance, compliance, recruitment, notifications, analytics, settings, onboarding/offboarding), with a working auth/multi-tenant foundation.
- AI features (Gemini-backed): a chat assistant, resume analyzer, JD generator, review writer, sentiment analysis, payroll anomaly detection, expense auto-categorization.
- A Supabase backend spanning **89 tables across 20 migrations**, 5 deployed Edge Functions, RLS policies, and a JWT hook injecting tenant context.

That is a large surface area for the timeframe, and it reflects what heavily AI-assisted development can produce when scoped well. The corresponding lesson, visible directly in this repo, is what that pace costs if not paired with equally disciplined follow-through:

## What went wrong (and is still true today)

1. **Depth lagged breadth.** Most of the admin dashboard's 14 modules are UI shells over mock JSON, not live data — the dashboard's own internal tracking doc (`WIRING_PHASES.md`) shows only the auth/foundation phase as complete, 13 domains still pending real wiring, even though the UI for all of them exists and looks finished. A demo would look far more complete than the product currently is.
2. **The project stalled for ~3 months** after 2026-05-14, with no commits, right in the middle of what looks like a security/compliance bug-fix pass.
3. **That fix pass — including a fix for an open-redirect vulnerability and a fix for analytics firing before cookie consent (a Philippine Data Privacy Act, RA 10173, concern) — was never committed.** It has been sitting in the working tree, unshipped and at risk, since it was written.
4. **The monorepo's own code-sharing intent was abandoned under time pressure.** `packages/ui-components` was meant to hold shared UI; it's an empty stub, and every app independently built its own component layer instead. `packages/supabase-client`'s database types were never regenerated against the real 89-table schema after the backend was built out. Neither of these blocked shipping in the short term, but both create compounding technical debt the longer they're left.
5. **Repo hygiene:** the actual product code lives in a nested git repository with its own GitHub remote, sitting inside this outer prompt-library repository without being registered as a proper submodule — invisible until you look for it, and a plausible source of a future lost-work incident.

None of this is unusual for a fast AI-assisted build — it's close to the textbook failure mode: velocity on new surface area outpaces the discipline of finishing, committing, and reconciling documentation with reality. The useful finding from this audit is that the *first* fix isn't a new feature; it's closing the loop on work that already exists but was never shipped.

## Where this sits against the market

Relative to Sprout and PayrollHero, this platform's differentiation, if finished, would be:
- **AI depth** — the Gemini-based feature set (resume/JD analysis, review writing, sentiment, payroll anomaly detection) is already broader than what most PH-market incumbents advertise, matching the 2026 HR-tech trend toward "systems of intelligence" rather than static self-service portals.
- **A genuinely modern, unified stack** across marketing, admin, and employee surfaces sharing one backend — several competitors are visibly composed of acquired/bolted-together modules.
- **A real compliance core already in place** (statutory calculations with citations) — the single hardest thing to get right in this market, and the one area of this codebase that's unambiguously production-quality today.

The gap to close is not "does the idea work" — the architecture and the hardest domain logic are sound — it's **finishing what's started**: wiring the remaining 13 admin-dashboard domains to real data, shipping the already-written landing-page security fixes, and building the superadmin app that lets this actually operate as a business. See `PROJECT_TIMELINE.md` for a staged plan to close that gap, and `STATUS.md` for the full current-state detail behind this case study.
