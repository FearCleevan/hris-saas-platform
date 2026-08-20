# FRONTEND_IMPLEMENTATION.md — hris-admin-dashboard Bug-Fix Plan

**Source of truth for every bug referenced here:** `ADMIN_DASHBOARD_AUDIT.md` (2026-08-20 full-codebase read). Do not re-derive root causes from scratch — the file:line citations below are copied from that audit; if a phase's description and the audit disagree, re-read the actual current file before proceeding (code may have changed since the audit).

## Adaptations from the standard protocol (read before Phase 1)

This is a **bug-fix / completion project on an existing, partially-live app**, not a new build, so two defaults from the standard protocol don't apply here and are deliberately skipped:

1. **No Design Direction section.** No new visual design is being created — every fix reuses the app's existing MUI + Tailwind + shadcn-style component set exactly as-is. Any UI touched should visually match its surrounding page without deviation.
2. **No mock-first ordering.** The app's established architecture (`isSupabaseConfigured` branching, documented in `WIRING_PHASES.md` rule 2) already means every service function talks to real Supabase when configured and mock JSON otherwise. These phases plug into that existing pattern from the start — there is no separate "backend integration phase" at the end; two phases (F3, F5) simply depend on the two new RPCs defined in `BACKEND_IMPLEMENTATION.md` (Phases B1/B2) being applied first.

## Phase order and dependencies

| # | Phase | Priority | Depends on |
|---|---|---|---|
| F1 | Real TOTP 2FA | P0 | — |
| F2 | Route-level RBAC (`RoleGuard`) | P0 | — |
| F3 | Fix employee delete | P0 | Backend B1 |
| F4 | Fix Benefits' statutory formulas | P0 | — |
| F5 | Fix leave approval to update balances | P0 | Backend B2 |
| F6 | Wire Payroll to Supabase + shared-utils | P1 | F4 (adds `@hris/shared-utils` dep) |
| F7 | Fix Holidays tab | P1 | — |
| F8 | Add Leave apply/cancel | P1 | — |
| F9 | Add Schedule delete | P1 | — |
| F10 | Wire Documents page to existing service | P1 | — |
| F11 | Integration Audit (mandatory final phase) | — | all above |

Run P0 phases (F1–F5) before any P1 phase. Within P0, F3 and F5 cannot be verified end-to-end until their backend phase is applied — build them, but flag in the Phase Report if the backend migration hasn't been run yet in the target environment.

---

## Phase F1 — Real TOTP 2FA

**File:** `src/pages/auth/TwoFactorPage.tsx`. **Bug:** verification currently accepts any code containing `123456`, or checks a mock JSON field — no `supabase.auth.mfa.*` call exists anywhere in the codebase (confirmed by audit grep).

**Assumption this phase proceeds under (flag if wrong):** there is currently no "enroll 2FA" UI anywhere in the app (Settings' tabs don't include one per the audit). Rather than scoping a separate enrollment page, this phase makes `TwoFactorPage.tsx` handle both cases inline: enroll-then-verify for a user with no TOTP factor yet, or challenge-then-verify for one who already has one. If a dedicated Settings → Security section is wanted instead, say so before this phase starts — it changes where the enroll UI lives, not the underlying Supabase calls.

**Steps:**
1. On mount, call `supabase.auth.mfa.listFactors()`. If a `totp` factor with `status: 'verified'` exists, go straight to challenge mode.
2. **Enroll mode** (no verified factor): call `supabase.auth.mfa.enroll({ factorType: 'totp' })`; render the returned `totp.qr_code` (already an SVG data URI) and the `totp.secret` as manual-entry fallback; on code submit, call `supabase.auth.mfa.challenge({ factorId })` then `supabase.auth.mfa.verify({ factorId, challengeId, code })`.
3. **Challenge mode** (verified factor exists): call `supabase.auth.mfa.challenge({ factorId })` then `supabase.auth.mfa.verify({ factorId, challengeId, code })` on submit.
4. On successful `verify()`, set the auth store's `isTwoFactorVerified = true` (same flag `ProtectedRoute.tsx` already checks) and navigate onward.
5. Delete the mock-code / `123456` / mock-JSON comparison entirely — do not leave it as a commented-out fallback.
6. Keep the existing mock-mode UI path (`!isSupabaseConfigured`) as a clearly-labeled demo bypass, matching how every other auth page in this app already handles the mock/real split.

**No backend change needed** — `config.toml` already has TOTP enabled at the project level; this phase only uses Supabase's existing Auth MFA API via `@supabase/supabase-js` (already a dependency, v2.47).

---

## Phase F2 — Route-level RBAC

**Files:** `src/App.tsx`, `src/components/router/RoleGuard.tsx` (already correctly implemented, just unused).

**Bug:** `navConfig.ts` role restrictions only hide sidebar links; the actual routes render for any authenticated user regardless of role.

**Steps:**
1. In `App.tsx`, wrap the route elements for `/payroll`, `/settings/*`, `/analytics`, `/expenses`, `/recruitment`, `/reports` (Compliance) with `<RoleGuard allowedRoles={[...]}>` — pull the exact allowed-roles list per route from `navConfig.ts`'s existing `roles: [...]` arrays for each corresponding menu item, so route-level and menu-level restrictions can't drift apart.
2. Verify `RoleGuard`'s redirect target (check the existing component — likely `/` or a "not authorized" state) makes sense for a direct-URL-typed unauthorized access, not just a nav-click case.
3. Do not change `RoleGuard.tsx`'s internal logic unless testing reveals a real bug in it — the audit found the logic itself correct, only unused.

---

## Phase F3 — Fix employee delete

**File:** `src/services/employees.ts:670,678`. **Depends on:** Backend Phase B1 (`delete_employees_hard` RPC now exists as a soft-delete).

**Steps:**
1. No signature change needed if Backend B1 keeps the same RPC name/params — verify the call site still matches (`p_employee_ids` param name).
2. Update `EmployeeListPage.tsx`'s delete confirmation copy (single-row and bulk-delete modal, ~lines 182-191) to say "Deactivate" rather than "Delete" if the soft-delete decision from `BACKEND_IMPLEMENTATION.md` was accepted — the current UI language implies permanent removal, which would now be inaccurate.
3. After a successful call, ensure the employee list query is invalidated/refetched so deactivated employees disappear from the default (active-only) view — check `useEmployees()`'s existing filter defaults rather than assuming.

---

## Phase F4 — Fix Benefits' statutory formulas

**File:** `src/pages/benefits/BenefitsPage.tsx:80-90`. **Bug:** local `calcSSS`/`calcPhilHealth`/`calcPagIBIG` functions use old flat-rate approximations instead of the real 2024 bracket tables.

**Steps:**
1. Add `@hris/shared-utils` as a dependency in `apps/hris-admin-dashboard/package.json` (workspace protocol, matching how other packages reference each other in this pnpm workspace — check `apps/employee-portal-web/package.json` or similar for the exact `"@hris/shared-utils": "workspace:*"` syntax already used elsewhere, if any; otherwise add it fresh).
2. Run the workspace install so the new dependency resolves (`pnpm install` at the monorepo root — confirm `packages/shared-utils/dist` is already built, it is as of this audit).
3. Replace `calcSSS(salary)` → `computeSSSContribution(salary)`, `calcPhilHealth(salary)` → `computePhilhealthContribution(salary)`, `calcPagIBIG(salary)` → `computePagibigContribution(salary)`, imported from `@hris/shared-utils`. Check each function's actual return shape (they return structured objects like `SSSContribution`, not a single number) and update every call site that expects a plain number accordingly — do not assume the shape matches the old local functions.
4. Do not touch the HMO, loans, dependents, or cost-analysis tabs — they don't involve statutory calculations and are out of scope for this phase.

---

## Phase F5 — Fix leave approval to update balances

**File:** `src/services/leaves.ts:192-218`. **Depends on:** Backend Phase B2 (`approve_leave_request`/`reject_leave_request` RPCs).

**Steps:**
1. Replace the current direct `.update()` on `leave_requests` inside `approveLeaveRequest()`/`rejectLeaveRequest()` with `supabase.rpc('approve_leave_request', { p_request_id, p_remarks })` / `supabase.rpc('reject_leave_request', { p_request_id, p_remarks })`.
2. In `LeavesPage.tsx`'s bulk approve/reject (~lines 153-179), keep the `Promise.all` pattern but now over the RPC calls; **also invalidate the `leave-balances` query key**, not just `leave-requests` (the audit's exact finding: balances go stale after approval because only requests were invalidated) — check both keys are invalidated after every approve/reject, single or bulk.
3. Surface the RPC's rejection (e.g. "already actioned") as a toast rather than a silent failure, since Backend B2 now explicitly rejects re-approving a non-pending request.

---

## Phase F6 — Wire Payroll to Supabase + shared-utils

**Files (create):** `src/services/payroll.ts`, `src/hooks/usePayroll.ts`. **File (update):** `src/pages/payroll/PayrollPage.tsx` (1171 lines — the UI is already excellent per the audit; this phase replaces its data source, not its layout).

This is the largest phase — treat it as several sub-steps within one phase, not a phase to split further without checking in first, since the audit found this UI's 6 tabs (runs, register, payslip, reports, disputes, ai-audit) are already fully built and share a lot of state.

**Steps:**
1. Read `20250501000009_payroll.sql` in full before writing `services/payroll.ts` — get exact column names for `payroll_periods`, `payroll_runs`, `payslips`, `payroll_items`, `salary_adjustments`, `loans`, `loan_amortization`, `thirteenth_month_pay`, `payroll_disputes`. Do not assume names match `PayrollPage.tsx`'s current mock JSON field names — they may differ (this happened nowhere else in the audit, but Payroll was never checked against its migration since no service existed yet).
2. Check whether the migration defines the SQL functions `compute_sss()`, `compute_philhealth()`, `compute_pagibig()`, `compute_withholding_tax()` mentioned in `WIRING_PHASES.md:125` — if they exist as Postgres functions, decide whether payroll computation should happen in the database (via these functions) or in the frontend (via `@hris/shared-utils`, added in Phase F4). **Pick one source of truth, not both** — running the same calculation in two places is exactly the kind of duplication this whole audit is trying to eliminate. Default recommendation: compute in the frontend via `@hris/shared-utils` for consistency with Benefits (Phase F4) and Attendance/Schedule overtime, unless the DB functions are already relied upon elsewhere.
3. Build `services/payroll.ts`: `getPayrollRuns()`, `getPayslips()`, `getPayrollDisputes()`, `approvePayrollRun()`, `getLoans()` — same real/mock branching pattern as every other service in this app.
4. Build `hooks/usePayroll.ts` with React Query wrappers (`staleTime: 1000 * 60 * 5`, matching project rule 3).
5. Replace `PayrollPage.tsx`'s mock imports (lines 11-14) tab-by-tab with the new hooks. Keep the existing workflow state machine (`draft→review→approved→released`) and CSV export logic as-is — they're UI-layer, not data-layer.
6. Fix the nonsensical "Est. 13th Month" KPI formula (`latestRun.totalGross * 12/12/12 * 50`, line ~654-664) — replace with an actual 13th-month-pay calculation (total basic salary earned for the year ÷ 12, per PH law) once real payroll data is available; if `thirteenth_month_pay` table data isn't populated yet, show an honest empty/"not yet computed" state rather than a fake number.
7. Leave `PayrollAnomalyReport.tsx` untouched — it's already a real, working Gemini feature; it will start auditing real data automatically once the tabs above feed it real payroll records instead of mock JSON (verify its input source, don't assume no change is needed).

---

## Phase F7 — Fix Holidays tab

**File:** `src/pages/attendance/AttendancePage.tsx` (`HolidaysTab`, ~lines 1161-1202).

**⚠️ Data gap found during planning, not just a wiring bug:** neither `packages/shared-utils/src/ph-holidays.ts` (only has `PH_HOLIDAYS_2024`/`PH_HOLIDAYS_2025`, `getHolidaysForYear()` returns `[]` for any other year) **nor** the `holidays` table seed in `20250501000007_attendance.sql` (only seeds 2025 dates) has 2026 data. Since the current date is 2026-08-20, simply swapping the data source without adding 2026 data will still show an empty/wrong Holidays tab. This phase must do both:

1. **Wire the tab to the real `holidays` table** via a new `getHolidays(year)` function in `services/attendance.ts` (this function was planned in `WIRING_PHASES.md:91` but never built) + a corresponding hook in `hooks/useAttendance.ts`. Query `organization_id IS NULL OR organization_id = current org` (nationwide vs. org-specific holidays, per the table's `is_nationwide` column) for the requested year.
2. **Add a 2026 PH holidays migration** (`backend/supabase/migrations/20260820000023_ph_holidays_2026.sql`) seeding the actual 2026 regular/special-non-working holiday list (source this from the official Malacañang proclamation — do not guess dates; if not available, flag this as a blocker rather than inventing dates).
3. Also update `packages/shared-utils/src/ph-holidays.ts` with a `PH_HOLIDAYS_2026` constant and add the `2026` case to `getHolidaysForYear()`'s switch — this keeps the package usable as a fallback/offline source consistent with the DB, and fixes it for any other consumer (e.g. Payroll's overtime/holiday-pay calculations in Phase F6).
4. Remove the `HolidaysTab`'s hardcoded `'2023'` fallback string and the direct `data/mock/ph-holidays.json` import entirely.

---

## Phase F8 — Add Leave apply/cancel

**File:** `src/services/leaves.ts`. **Bug:** `applyLeave()`/`cancelLeave()` don't exist despite being planned.

**Steps:**
1. `applyLeave(payload)` — insert a `leave_requests` row (`status: 'pending'`), then increment the matching `leave_balances.pending_days` by `total_days` (insert a `leave_balances` row first if none exists for that employee/type/year, mirroring the defensive logic in Backend Phase B2).
2. `cancelLeave(requestId)` — only allowed while `status = 'pending'`; update to `status: 'cancelled'` and decrement `leave_balances.pending_days` back down.
3. Add corresponding `useApplyLeave()`/`useCancelLeave()` mutations in `hooks/useLeaves.ts`, invalidating both `leave-requests` and `leave-balances` query keys (same lesson as Phase F5).
4. Wire these into `LeavesPage.tsx`'s Requests tab — check whether a "New Request" / "Cancel" UI already exists in a non-functional state before building new UI from scratch.

---

## Phase F9 — Add Schedule delete

**File:** `src/services/attendance.ts`, `src/pages/schedule/SchedulePage.tsx` (`ShiftsSettingsTab`, ~lines 1161-1264).

**Steps:**
1. Add `deleteSchedule(scheduleId)` to `services/attendance.ts` — a plain `supabase.from('schedules').delete().eq('id', scheduleId).eq('organization_id', orgId)` is sufficient (no new RPC needed) **provided** the existing RLS policy on `schedules` from `supabase-rls-fix.sql` already permits deletes for admin/manager roles. **Verify this before writing the frontend call** — if RLS only has `SELECT`/`INSERT`/`UPDATE` policies and no `DELETE` policy, add one in a small migration as part of this phase (check first, don't assume it's missing or present).
2. Add `useDeleteSchedule()` to `hooks/useAttendance.ts`.
3. Add a delete action/confirmation to `ShiftsSettingsTab` alongside the existing "Edit" action. Consider whether shifts with existing `employee_schedules` assignments should block deletion or cascade — check the FK's `ON DELETE` behavior in the migration rather than assuming.

---

## Phase F10 — Wire Documents page to existing service

**File:** `src/pages/documents/DocumentsPage.tsx`. **Note:** `src/services/documents.ts` already exists and works (used by `EditEmployeePage.tsx`, `EmployeeProfilePage.tsx`) — this phase connects an already-working backend to a page that just never imported it. This is the cheapest phase in this entire plan.

**Steps:**
1. Create `hooks/useDocuments.ts` wrapping the existing `getEmployeeDocuments()`/`uploadEmployeeDocuments()`/`getDocumentDownloadUrl()` from `services/documents.ts`, plus any category/library-level queries the page needs beyond the per-employee functions that already exist (check whether `documents.ts` covers org-wide document library queries or only employee-document-upload — extend the service if the Library tab needs org-wide listing that isn't there yet).
2. Replace the Library/201-File/Expiring/Versions tabs' mock JSON imports with the new hook.
3. **Upload tab**: replace the fake `toast.success('Upload simulated...')` (line ~377) with a real `<input type="file">` wired to `uploadEmployeeDocuments()`.
4. **Signatures/Versions tabs**: the `e_signatures` and `document_versions` tables already exist in the schema but nothing writes to them yet from any part of the app. Scope decision needed: either build minimal real read/write for these two tables in this phase, or explicitly leave them as labeled "coming soon" (matching the honest-stub pattern the audit found acceptable elsewhere, e.g. Expenses' OCR placeholder) rather than a silent toast that implies it worked. Default to the labeled-stub approach unless told this needs to be real now — it's a meaningfully larger scope (e-signature flow) than the rest of this phase.

---

## Phase F11 — Integration Audit (mandatory final phase)

1. `grep -r "data/mock/" src/` across every file touched in F1–F10 — confirm no lingering mock imports remain in pages that are now supposed to be live-wired (Benefits, Leave, Payroll, Documents, Holidays tab, Schedule).
2. Confirm every new/changed service function still follows the project's own Rule 2 (Supabase path **and** mock fallback, gated on `isSupabaseConfigured`) — this audit specifically found `getUserOrganizations()` violating this rule; don't introduce a second instance of it.
3. Confirm every new/changed hook uses `staleTime: 1000 * 60 * 5` per Rule 3, and invalidates the correct query keys (this audit found two real invalidation bugs — leave balances after approval, and the Dashboard/Notifications dual-mock-copy desync — verify neither pattern was reintroduced).
4. Run `npx tsc --noEmit` and `npm run build` — both must pass with zero errors before this plan is considered complete.

---

## UI states to handle (applies to every phase touching a page, not just new components)

- **Loading**: every new hook-backed tab needs a loading skeleton/spinner state — check `components/common/LoadingSpinner.tsx` for the existing pattern rather than inventing a new one.
- **Empty**: e.g. an employee with no payroll history yet, no leave balance row for a new leave type — write real interface copy ("No payroll runs yet for this employee" style), not a blank table.
- **Error**: every Supabase call needs a toast or inline error state on failure — this audit found auth pages do this well already; match that standard in every phase here, don't regress to silent failure (the exact class of bug found in `getUserOrganizations()`).

---

## Known Gotchas (frontend-specific, carried over from the audit)

- The `isSupabaseConfigured` mock/real branch must be checked in every new service function — several existing ones in this app already do this correctly (`employees.ts`, `onboarding.ts`, `offboarding.ts`) — copy their exact pattern rather than reinventing it per phase.
- Do not delete any `data/mock/*.json` files even after wiring a page to real data — project rule 4 keeps them as the fallback source for local/demo mode.
- Cross-check any new React Query key names against ones already in use (`['leave-requests']`, `['leave-balances']`, etc.) — reuse exact existing key strings so invalidation from one phase's mutations correctly refreshes another phase's queries.

## Security Shortcuts to flag if encountered

- If Phase F1's TOTP enrollment flow reveals there's no way to *disable*/re-enroll 2FA once set (e.g. a lost device), flag this explicitly — a real support/account-recovery gap, not silently ship it.
- If Phase F9 finds `schedules` has no DELETE RLS policy, adding one is in scope for that phase, but flag exactly which roles it's granted to before merging — deletion is higher-risk than the read/write policies already in place.

---

**Files generated. Shall I begin Phase B1 of `BACKEND_IMPLEMENTATION.md` (the employee soft-delete RPC — pending your confirmation on the soft-delete-vs-hard-delete decision above), or Phase F1 of this file (real TOTP 2FA, no backend dependency)?**
