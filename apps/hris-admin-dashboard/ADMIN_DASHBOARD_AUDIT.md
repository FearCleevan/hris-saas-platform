# HRIS Admin Dashboard — Full Code Audit & Roadmap

**Generated:** 2026-08-20
**Method:** Every file in `src/` was read in full (not grepped) across 7 focused passes — shell/routing, auth, employees/onboarding/offboarding, attendance/schedule/leave, payroll/benefits/expenses, documents/performance/compliance/recruitment, dashboard/analytics/notifications/settings — then cross-checked against the Supabase migrations and `packages/shared-utils`. This supersedes `WIRING_PHASES.md`, which understates progress in some areas and overstates it in others.

---

## 1. Executive summary

This app is **structurally sound and further along than its own tracking doc claims**, but has a consistent pattern worth naming up front: **AI features got built before the core data plumbing they'd sit on top of.** Every domain that's still on mock data (Payroll, Benefits, Expenses, Performance, Recruitment, Analytics/Attrition) already has a real, working Gemini-backed AI feature — anomaly detection, review writing, sentiment analysis, resume/JD generation, attrition prediction — while the underlying CRUD (create a payroll run, log a review, post a job) is not wired to the database at all. That's an unusual and specific kind of unfinished: the flashy layer is done, the foundation under it isn't.

Five and a half of fourteen domains are genuinely wired to Supabase (Auth, Employees-core, Onboarding, Offboarding, Attendance-core, Leaves-core, Schedule-core), but even those have real bugs — a delete button that calls a database function that doesn't exist, a 2FA screen that accepts any code, a leave-approval flow that never touches the balance it's supposed to approve against. None of these are visible in a demo click-through; all of them would surface the first time a real tenant used the product.

**If this were shown to a real customer today, the two things that would break trust fastest are:** the fake 2FA (silently no security), and Payroll/Benefits showing numbers that are either static mock data or actively wrong statutory formulas (a payroll product showing wrong SSS/PhilHealth math is not a bug, it's a legal problem for the customer).

---

## 2. Full route / menu map

Every `navConfig.ts` menu item has a matching real route in `App.tsx` — no dead menu links. One route exists with no menu entry.

| Route | Menu label | Page | DB wiring |
|---|---|---|---|
| `/` | Dashboard | DashboardPage | Mixed — mostly mock |
| `/employees...` | Employees | EmployeeListPage + 5 sub-pages | Mostly real |
| `/onboarding...` | Onboarding | OnboardingPage/Detail | **Fully real** |
| `/offboarding...` | Offboarding | OffboardingPage/Detail | **Fully real** (2 bugs) |
| `/attendance` | Attendance | AttendancePage | Mostly real (Holidays mock, Corrections unbuilt) |
| `/schedule` | Shifts & Schedule | SchedulePage | Real (no delete) |
| `/leaves` | Leave Management | LeavesPage | Real reads/approve; no apply/cancel; balance not updated |
| `/payroll` | Payroll | PayrollPage | **Mock only** — 0% DB wiring |
| `/benefits` | Benefits | BenefitsPage | **Mock only**, and its own calc formulas are wrong |
| `/expenses` | Expenses | ExpensesPage | **Mock only** |
| `/documents` | Documents | DocumentsPage | **Mock only** (a real doc service exists but isn't connected to this page) |
| `/performance` | Performance | PerformancePage | **Mock only** |
| `/recruitment` | Recruitment | RecruitmentPage | **Mock only** |
| `/reports` | Reports | CompliancePage | **Mock only** (menu label doesn't match the page) |
| `/analytics` | Analytics | AnalyticsPage | **Mock only**, one real AI sub-feature |
| `/hr-policy` | HR Policy Q&A | HRPolicyPage | Real Gemini chat (extra, not in original spec) |
| `/settings/*` | Settings | SettingsPage | 9 of 10 tabs mock/non-persistent; Team & Access real |
| `/notifications` | *(no menu entry — bell icon only)* | NotificationsPage | Mock, no realtime |

---

## 3. What's actually finished (verified working)

- **Auth core flows** — Login, SignUp, CompanySetup, ForgotPassword, AuthCallback all make real Supabase calls with real error handling. No open-redirect vulnerability (the class of bug found in the sibling landing-page's auth callback does not reproduce here).
- **Employees** — full CRUD service/hooks matching the real schema column-for-column; create (8-step wizard), edit, org chart (real reporting-hierarchy from live data), and CSV bulk upload (real parse + batch insert) all work.
- **Onboarding & Offboarding** — both fully wired: task/clearance checklists genuinely persist and recompute status, workflows seed correctly from templates.
- **Attendance core** — daily/calendar/reports/overtime tabs are real; overtime approve/reject genuinely writes to the database.
- **Schedule** — shift create/edit and the multi-select employee assignment picker are real.
- **AI features (across the board)** — AI Chat Widget, Payroll Anomaly Report, Benefits(N/A)/Expenses Smart Categorizer, Performance Review Writer & Sentiment Analyzer, Recruitment JD Generator & Resume Analyzer, HR Policy Q&A chat, and Attrition Risk Predictor are **all real `generateContent()`/`startChat()` Gemini calls**, not stubs — properly gated behind an API-key check with sensible loading/error states. This is a genuine strength and differentiator once the data under them is real.
- **Team & Access (Settings)** — invite/revoke/resend/role-change genuinely calls Supabase with an optimistic-update-then-rollback pattern.

---

## 4. What's not finished, by severity

### Critical — would break trust or the law with a real customer
| Issue | Location | Impact |
|---|---|---|
| **2FA is fake** | `pages/auth/TwoFactorPage.tsx` | No `supabase.auth.mfa.*` call exists anywhere. Any 6-digit code containing `123456` — or comparison against a mock JSON field — succeeds, even with Supabase configured. `config.toml` enables real TOTP; this page enforces nothing. |
| **No route-level access control** | `RoleGuard.tsx` is written correctly but imported nowhere | `navConfig.ts` role restrictions only hide sidebar links. Any authenticated user (e.g. `hr_staff`) can navigate directly to `/payroll`, `/settings`, `/analytics` by URL and the page renders. For a payroll product, this is a real data-exposure gap. |
| **Employee delete calls a function that doesn't exist** | `services/employees.ts:670,678` → `supabase.rpc('delete_employees_hard', ...)` | No such function is defined in any migration. Every single or bulk delete will hard-fail against a real database. |
| **Benefits page computes SSS/PhilHealth/Pag-IBIG with its own wrong, flat-rate formulas** | `pages/benefits/BenefitsPage.tsx:80-90` | These are old, non-bracketed approximations, not the real 2024 tables that already exist correctly in `packages/shared-utils`. This isn't "needs wiring," it's "needs the wrong math replaced" — showing incorrect statutory numbers to an employer is a compliance issue. |
| **Leave approval never updates the balance it approves against** | `services/leaves.ts:192-218` | Approving/rejecting only flips `leave_requests.status`; `leave_balances.used_days`, `leave_approvals`, and `leave_credits_history` are never written. Balances silently drift from reality. |

### High — will produce visibly wrong or missing behavior
- **`packages/shared-utils` (real, cited PH statutory calculators) is completely unused by this app** — not imported anywhere, not even declared as a workspace dependency in `package.json`. Every domain that will eventually need SSS/PhilHealth/Pag-IBIG/BIR/overtime math (Payroll, Benefits, Compliance, Attendance/Schedule OT) currently has zero access to the correct implementation that already exists two folders away.
- **Holidays tab reads a stale, disconnected mock file** (`data/mock/ph-holidays.json`, 2023 dates only) instead of the real `holidays` table or `shared-utils/ph-holidays.ts` — with `currentYear` at 2026, this tab shows wrong or empty data in production regardless of Supabase config. Three independent, non-agreeing PH holiday sources exist in the codebase (DB seed, this mock file, shared-utils) and none is treated as authoritative.
- **Leave `applyLeave()`/`cancelLeave()` don't exist** — despite being explicitly scoped in the wiring plan, there's currently no way to submit or withdraw a leave request through this service; the page is approve/report-only.
- **Schedule delete was never built** — create/edit exist, delete doesn't, in either the service layer or the UI.
- **`offboarding.ts:245`** orders by `.order('clearance_items(sort_order)')` as a single string — not Supabase-js's documented syntax for ordering by an embedded table column (`.order('sort_order', { foreignTable: 'clearance_items' })`). Clearance items likely don't sort correctly.

### Medium — real but lower-impact bugs
- Dead buttons: both "Download COE" buttons in Offboarding (no `onClick` at all); NotificationDrawer's "Mark all read" (no handler); Dashboard's "Pending Approvals" KPI permanently shows `'—'`; the PendingApprovals widget has no approve/reject action, only navigation.
- `TenantSelectorPage` depends on `getUserOrganizations()`, which has **no mock fallback** — violates the project's own stated rule ("every service function must have a Supabase path and a mock fallback") and fails silently (no error shown) when Supabase isn't configured.
- Three different hardcoded "today" dates baked into different mock computations — Dashboard anchors to `2026-04-22`, Analytics/Settings-Backup anchor to `2023-11-24` — headcount/tenure/attrition figures would visibly disagree if cross-checked.
- CSV bulk-upload parser does naive `line.split(',')` — no quoted-field handling, so any name/address containing a comma silently misparses columns.
- `EditEmployeePage` silently "succeeds" (shows a success toast, navigates away) without persisting anything when Supabase isn't configured — fine in mock mode today, but a misleading pattern if replicated elsewhere.
- The standalone Documents module page (`/documents`) is 100% disconnected from `services/documents.ts` — a real, working Supabase Storage-backed document service that's already used successfully by the Employee Profile/Edit pages. The infrastructure exists; this page just was never pointed at it.
- Google SSO button here at least tells the user it's not implemented (`toast.info('Google SSO integration coming soon')`) rather than failing silently like the equivalent button on the landing page — better, but still non-functional.

### Low
- `Sidebar.tsx` role filter uses a double type-cast instead of a clean `UserRole` type — a patched-over type mismatch.
- `CommandPalette` and `AIChatWidget` search/context both read `data/mock/employees.json` directly instead of the real `useEmployees()` hook already used by the Employees page — search results and AI answers about "employees" won't reflect real data even once Payroll etc. are wired.
- No billing/plan tab exists in Settings (expected to live in `superadmin-dashboard` instead, per the platform spec — not a bug, just confirming the gap is intentional).

---

## 5. Corrected phase status (vs. `WIRING_PHASES.md`)

| Phase | Doc says | Actually is |
|---|---|---|
| 1 — Auth & Orgs | ✅ Complete | Mostly true — but 2FA is fake and Tenant Selector's fallback is missing. Add a caveat, don't mark clean. |
| 2 — Employee DB | ⬜ Not started | **Wrong** — mostly wired; delete is broken; Payroll/Attendance/Leave/Performance/201-File tabs on the Profile page are still mock; `employee_dependents` table is entirely unused. |
| 3 — Onboarding/Offboarding | ⬜ Not started | **Wrong** — both fully wired, two minor bugs (dead COE buttons, sort-order query). |
| 4 — Attendance | ⬜ Not started | **Wrong** — daily/calendar/reports/overtime/shifts real; Holidays 100% mock+stale; Corrections never built. |
| 5 — Leave Management | ⬜ Not started | **Wrong** — reads/approve real but with a real business-logic gap (balances not updated); apply/cancel missing entirely. |
| 6 — Payroll | ⬜ Not started | **Correct** — 0% DB wiring, though UI is excellent and the AI anomaly feature is real. |
| 7 — Benefits | ⬜ Not started | **Correct**, plus worse than "not started": contains actively wrong calculation logic that will need replacing, not just connecting. |
| 8 — Expenses | ⬜ Not started | **Correct** — UI excellent, OCR honestly self-labeled as a placeholder. |
| 9 — Documents | ⬜ Not started | **Correct for this page** — but note real document infrastructure already exists and is used elsewhere; wiring this page is cheaper than the doc implies. |
| 10 — Performance | ⬜ Not started | **Correct** for CRUD; AI tools already real. |
| 11 — Compliance | ⬜ Not started | **Correct**, and doesn't reuse shared-utils either. |
| 12 — Recruitment | ⬜ Not started | **Correct** for CRUD; AI tools already real. |
| 13 — Notifications | ⬜ Not started | **Correct**, plus page and drawer are two independent, unsynchronized copies of the same mock data. |
| 14 — Dashboard/Analytics/Audit | ⬜ Not started | **Correct**, except one real AI feature (Attrition Risk Predictor) and a partially-real KPI (employee stats). No audit-log UI exists anywhere in this app despite the `audit_logs` table existing in the backend. |

---

## 6. Recommended roadmap, in priority order

### P0 — fix before showing this to any real customer
1. Implement real Supabase MFA on `TwoFactorPage`, or remove the 2FA claim from anything customer-facing until it's real.
2. Wire `RoleGuard` onto every sensitive route (`/payroll`, `/settings`, `/analytics`, `/expenses`, `/recruitment`, `/compliance`) — it already exists and works, it's just not attached to anything.
3. Fix the employee-delete RPC (either add the missing `delete_employees_hard` function to a migration, or switch to the soft-delete pattern the schema already implies elsewhere).
4. Replace Benefits' local contribution formulas with real calls into `packages/shared-utils`.
5. Fix leave approval to actually write `leave_balances`, `leave_approvals`, and `leave_credits_history`.

### P1 — finish the product's actual value proposition
6. Wire Payroll end-to-end (`services/payroll.ts`, `hooks/usePayroll.ts`) and route every SSS/PhilHealth/Pag-IBIG/BIR figure through `packages/shared-utils` — this is explicitly the "CRITICAL — MOST IMPORTANT PHASE" per the original spec, and it's currently the least-real domain in the app.
7. Fix the Holidays tab to read the real `holidays` table (falling back to `shared-utils/ph-holidays.ts`, not the stale mock file) — cheap fix, currently broken in a way that's easy to miss in a demo.
8. Build `applyLeave()`/`cancelLeave()`, Schedule delete, and an `attendance_corrections` UI — the three concretely missing pieces in otherwise-wired domains.
9. Point the Documents module page at the `services/documents.ts` that already exists — the single cheapest large unlock in this entire audit, since the backend work is done.

### P2 — finish breadth across the remaining domains
10. Wire Compliance, Recruitment, and Performance CRUD to Supabase — their AI features are already production-quality and just need real data under them.
11. Rebuild Notifications on Supabase Realtime with one shared hook/store (fixes the page/drawer desync as a side effect).
12. Replace Dashboard/Analytics' static and `Math.random()`-based figures with real aggregation queries (or Postgres views) once the domains feeding them are wired.

### P3 — what would make this stand out and scale (informed by 2026 HR-tech and Supabase research)
- **Turn the AI layer agentic, not just conversational.** Current AI features (anomaly detection, review writing, resume analysis) are already ahead of most PH competitors — the 2026 trend is autonomous multi-step workflows, not chat. E.g., let the Payroll Anomaly Report propose the fix, not just flag it; let onboarding's AI draft the welcome/task-assignment sequence, not just answer questions about it.
- **Explore Earned Wage Access (on-demand pay)** as a differentiator — a genuine 2026 HR-tech trend, and a natural fit given PayMongo/GCash rails are already planned for the platform's billing side; PH frontline/hourly workers are a strong match for this.
- **Upgrade HR Policy Q&A from a hand-authored context block to real RAG** (Supabase now supports `pgvector`) — scales to a growing, tenant-specific policy library instead of one fixed prompt, and lets each org customize its own handbook content.
- **Consolidate CommandPalette, Global Search, and the AI Chat Widget onto one real data source** (the existing `useEmployees()` hook) instead of three independent mock-JSON imports — both a correctness fix and a "feels like one coherent product" win.
- **Promote `packages/ui-components` from an empty stub into a real shared library.** This app and `employee-portal-web` have each independently hand-built their own MUI component layer — consolidating now is far cheaper than after `employee-portal-mobile` and `superadmin-dashboard` also start duplicating it.
- **Scale-readiness on the Supabase side:** ensure `organization_id` is indexed on every RLS-filtered table (the top cause of RLS performance problems per current guidance), and if Notifications become Realtime, scope channels per-tenant/per-user rather than broadcasting broadly — Supabase's own guidance flags >500 concurrent Realtime connections as needing a deliberate scaling plan (dedicated plan, self-hosted Realtime, or Ably/Pusher), worth deciding on before Notifications and any future live-collaboration feature ships widely.
- **Add payroll unit tests once wired**, per the original spec's own requirement, and get PH-accountant sign-off before this is used for a real payroll run — the compliance stakes here are real, not hypothetical.

---

## Sources consulted for the standout/scalability recommendations
- [Top 3 HR + Payroll Trends in 2026](https://www.sylogist.com/blog/top-3-hr-payroll-trends-in-2026-what-north-american-organizations-need-to-know/)
- [Earned Wage Access 2026: On-Demand Pay Trends to Know](https://lifthcm.com/article/earned-wage-access-2026-on-demand-pay-trends-to-know)
- [Best Earned Wage Access Platforms of 2026](https://enterprise.chime.com/blog/best-earned-wage-access-providers-2026/)
- [Supabase Multi-Tenant Architecture: Best Practices 2026](https://www.iloveblogs.blog/guides/nextjs-supabase-multi-tenant-saas-architecture)
- [Taking Supabase to Production in 2026](https://www.frontendtechlead.com/blog/supabase-production-architecture-2026)
- [Supabase Realtime in Production: What Nobody Tells You](https://www.agilesoftlabs.com/blog/2026/05/supabase-realtime-in-production-what)
- [Supabase RLS Best Practices: Production Patterns](https://makerkit.dev/blog/tutorials/supabase-rls-best-practices)
- [10 HR Technology Trends for 2026](https://engagedly.com/blog/top-hr-technology-trends/)
