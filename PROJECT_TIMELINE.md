# HRIS SaaS Platform — Project Timeline

**Generated:** 2026-08-20. Historical section is reconstructed from `git log` (31 commits, 2026-04-21 → 2026-05-14) plus dated files in the working tree. Forward-looking section is an estimate, not a commitment — ranges assume the same AI-assisted, largely solo development pace observed in the historical section.

---

## Part 1 — What actually happened (verified from git history)

| Date | Milestone |
|---|---|
| **2026-04-21** | Monorepo initialized (Turborepo + pnpm workspaces). Landing page build begins same day. |
| **2026-04-22** | Landing page: route navigation, sign in/up, "Start Free Trial," SEO pass. Vercel deployment configured. |
| **2026-04-23** | Landing page polish (colors, button copy). README rewritten for the SaaS platform. |
| **2026-04-24** | **Heaviest single day of the project.** Admin dashboard stood up: shift CRUD with employee assignment, then in the same day — 9 modules (attendance, schedule, benefits, expenses, documents, performance, compliance), then Recruitment/ATS, Analytics & AI Insights, and Settings/Administration. Expenses management improved same day. |
| **2026-04-25** | General feature hardening across the dashboard. |
| **2026-04-28** | AI & automation features shipped (spec's Phases 18–20): Gemini-backed chat assistant, resume analyzer, JD generator, review writer, sentiment analysis, anomaly detection. |
| **2026-04-30** | Vercel config iterated. |
| **2026-05-01** | Employee portal web scaffolded; Supabase backend stood up; logout route fixed; first SQL functions added. |
| **2026-05-02 – 05-06** | Real backend wiring begins: database connected to frontend for real data (not just mock), backend features added across several days. |
| **2026-05-13** | Employee "Preview" step before form submission; full mobile/tablet responsiveness pass across admin pages; offboarding detail/initiate flows wired with a reusable DatePicker. |
| **2026-05-14** | Schedule/shift form improved with multi-select employee picker and HR logic — **last commit to date.** |
| **~2026-05-30** *(uncommitted)* | A self-audit of the landing page produced `FIX-PLAN.md`/`FIXES.md`; fixes for the open-redirect and consent-ordering bugs, plus real API routes for demo/contact/newsletter, were written into the working tree — **but never committed.** |
| **2026-08-20** | This audit. ~3 months with no commits; the 2026-05-30 fixes are still sitting uncommitted. |

**Observed pace:** roughly 24 active development days delivered a landing page, a 14-module admin dashboard UI shell, AI features, and an 89-table backend — a genuinely fast build, consistent with heavy AI-assisted development. The project then stalled for ~14 weeks with real, unshipped work left on disk.

---

## Part 2 — What's left, and a realistic path forward

This assumes the immediate actions in `STATUS.md` §4 are done first (commit the security fix, regenerate DB types, reconcile the phase doc). Estimates are ranges in **working days of focused effort**, not calendar time — calendar time depends entirely on how much time per week is actually spent, which this history shows is highly variable (dense bursts, then months idle).

### Stage A — Close the gap on what's already started (~1–2 weeks)
- Commit and deploy the landing-page fix pass.
- Regenerate Supabase types; fix any type errors that surface.
- Reconcile `WIRING_PHASES.md` against actual code so progress tracking is trustworthy again.
- Decide the git-hygiene question (submodule vs. standalone repo) before it causes a lost-work incident.

### Stage B — Finish the core product: hris-admin-dashboard Phases 2–14 (~6–10 weeks)
This is the largest and highest-value remaining block, because it's the actual product a customer pays for. Recommended order, front-loading what the original spec calls the critical path:
1. Employee Database (foundation for everything else)
2. **Payroll Engine** — spec explicitly marks this "CRITICAL — MOST IMPORTANT PHASE," requires unit tests and PH-accountant verification before production use.
3. Attendance + Leave Management (feed payroll)
4. Onboarding/Offboarding, Benefits/Loans, Expenses, Documents, Performance, Compliance & Reports, Recruitment, Notifications, Dashboard/Analytics/Audit — remaining 9 domains, can parallelize across sessions once the pattern from Employee DB + Payroll is proven.

### Stage C — Unlock employee-portal-web (~2–3 weeks)
Frontend is already built; this is primarily backend wiring using patterns already proven in Stage B, plus employee-scoped RLS (already partly designed per the original backend spec, which explicitly shares tables with hris-core rather than duplicating). Cheapest large unlock in the codebase relative to what already exists.

### Stage D — superadmin-dashboard (~8–12 weeks)
Needed before this can be run as an actual business: MRR/ARR/churn analytics, tenant management with audited impersonation, Stripe + PayMongo billing (GCash/Maya/GrabPay, 12% VAT), support ticketing, DPA/compliance tooling, AI churn/revenue forecasting. Largest single remaining app; industry research on vertical-SaaS billing/compliance build-outs supports this being the long pole, not the core HR features.

### Stage E — employee-portal-mobile (~6–10 weeks)
React Native + Expo, biometric auth, GPS-geofenced/selfie clock-in, offline sync, push notifications, store submission prep. Can run in parallel with Stage D since it depends on the same backend, not on superadmin.

### Stage F — Hardening & launch readiness (~3–5 weeks)
Per the original spec's own "Post-Completion Checklist": security audit, PH-accountant sign-off on payroll math, legal review of ToS/Privacy Policy, DPA/RA 10173 compliance verification, beta testing with 5–10 real customers, load testing, deployment runbook.

### Rollup estimate
**~26–42 working days for Stage A+B alone** (core product usable end-to-end), **~50–75 working days total** to the full original scope (superadmin + mobile + hardening) if worked as a single continuous effort. External research on vertical SaaS timelines (regulated-industry MVPs commonly run 3–6 months pre-launch plus 2–4 months build) is broadly consistent with this range, though this project's observed pace has been faster than typical due to AI-assisted development — the risk is stalls like the one just observed, not raw build speed.

### Shipping order recommendation
Given the platform already has a real (if partially mock) admin dashboard, the fastest path to a sellable MVP is **Stage A → B → C**, launching with the admin dashboard + employee portal only, deferring superadmin's advanced billing to a simpler interim solution (e.g. manual invoicing or a single Stripe integration without PayMongo) so real customers can be onboarded sooner, then building out D/E/F against real usage feedback rather than upfront.
