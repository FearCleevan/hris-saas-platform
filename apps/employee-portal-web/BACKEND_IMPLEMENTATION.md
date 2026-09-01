# Employee Portal Web — Backend Integration Plan

## Overview

Unlike a typical "build the backend" plan, **the backend already exists.**
Every table this app needs is already in the live schema (Supabase project
`ztpoqosyrcepvwwwnsar`, the same one `hris-admin-dashboard` and the `hris-mcp`
connector use), and — this was the key finding that shapes this whole
plan — **self-service RLS policies already exist for most of them**,
confirmed live via `pg_policies`:

| Table | `self_select` | `self_insert` | `self_update` |
|---|---|---|---|
| `employees` | ✅ (`user_id = auth.uid()`) | — | ✅ |
| `attendance_logs` | ✅ | ✅ | — |
| `leave_requests` | ✅ | ✅ | ✅ (only while `status = 'pending'`) |
| `leave_balances` | ✅ | — | — |
| `payslips` | ✅ | — | — |
| `documents` | ✅ (own + shared-with-me) | ✅ | — |
| `expense_claims` | ✅ | ✅ | ✅ (only while `status IN ('draft','submitted')`) |
| `employee_reviews` | ✅ | — | ✅ (only while `status = 'self_review'`) |
| `notifications` | ✅ (`recipient_id = auth.uid()`) | — | ✅ |
| `employee_employment` | ✅ (added Phase 1) | — | — |
| `departments` | ✅ (added Phase 1) | — | — |
| `positions` | ✅ (added Phase 1) | — | — |

**Real gap found during Phase 1, now fixed**: `employee_employment`/
`departments`/`positions` only had `org_select_*` policies gated on
`get_my_org_id()`, which resolves via `user_profiles.organization_id` —
**not** via `employees.organization_id`. A plain ESS-only account (linked
via `employees.user_id` but with no `user_profiles` row, since that table
is admin/HR-portal-centric) could see their own `employees` row but not
their own department/position. Added matching `self_select_*` policies for
all three (migration `add_ess_self_select_employment_dept_position`),
following the exact `employee_id IN (SELECT id FROM employees WHERE
user_id = auth.uid())` pattern already used everywhere else. Confirmed via
`get_advisors` that this introduced no new security lint findings.

This means most of this plan is **wiring**, not backend design: a real
Supabase Auth session, a typed service layer mirroring
`hris-admin-dashboard/src/services/*.ts`'s existing pattern, and TanStack
Query hooks calling it. Where a table's self-access policy hasn't been
confirmed yet (see the table below), that phase includes writing it,
following the exact pattern already proven on the tables above — not
inventing a new access model.

**Not yet confirmed to have self-access RLS** (checked and confirmed
*absent* or simply not yet checked — treat as "needs a policy," don't
assume): `employee_benefits`, `hmo_plans`, `hmo_dependents`, `loans`,
`loan_applications`, `employee_goals`, `improvement_plans`,
`notification_preferences`, `overtime_requests`, `attendance_corrections`,
`document_versions`, `review_scores`. Several of these
(`employee_benefits`, `employee_goals`, `notification_preferences`) also
have **zero rows anywhere in the database** and no existing service in
`hris-admin-dashboard/src/services/` either — meaning this ESS build may be
the first real app code to ever touch them. Treat those specifically as
higher-risk: verify the column shapes match what the mock JSON assumes
before wiring, don't assume.

---

## Auth Strategy

`employee-portal-web` currently has **no real authentication** —
`store/authStore.ts`'s `login(user)` accepts any locally-constructed
`EmployeeUser` object, persisted to `localStorage` via `zustand/persist`.
This is Phase 1, and everything else depends on it.

- Real Supabase Auth (`@supabase/supabase-js`, same pattern as
  `hris-admin-dashboard/src/lib/supabase.ts` — anon key, not service role;
  this is a browser app) — email/password sign-in against the same
  `auth.users` table every other HRISPH app uses.
- On sign-in, resolve the session's `auth.uid()` to a row in `employees`
  via the existing `self_select_employee` policy (`employees.user_id =
  auth.uid()`) — **not** every `auth.users` row has a matching `employees`
  row (e.g. HR admins in `hris-admin-dashboard` may not), so sign-in must
  explicitly handle "authenticated but no employee record" as a real error
  state (message: "This account isn't set up as an employee — contact your
  HR admin"), not a silent crash.
- `authStore.ts` is reduced to **UI-only state** (`darkMode`,
  `mobileOpen`) — identity/session lives in Supabase's own session
  (`supabase.auth.getSession()` / `onAuthStateChange`), read via a new
  `useAuth()` hook mirroring `hris-admin-dashboard/src/hooks/useAuth.ts`'s
  existing shape.
- **Protected routes**: every route under `DashboardLayout` (all 12
  domains) requires a valid session AND a resolved `employees` row.
  `/login`, `/forgot-password` stay public.

---

## API / Data-Access Layer

No custom REST endpoints — this app talks to Supabase directly via
`@supabase/supabase-js`, exactly like `hris-admin-dashboard` does (no Edge
Function layer needed for ESS reads/writes; RLS is the security boundary).
New `src/services/*.ts` files, one per domain, each a thin typed wrapper
around `supabase.from(...)`, mirroring the existing admin-dashboard
convention:

| Service file | Tables | Key ops |
|---|---|---|
| `services/profile.ts` | `employees`, `employee_employment`, `employee_compensation`, `employee_government_ids`, `employee_bank_accounts`, `employee_emergency_contacts`, `employee_dependents` | read own row (join), update own contact/bank/emergency info |
| `services/attendance.ts` | `attendance_logs`, `overtime_requests`, `attendance_corrections`, `employee_schedules`, `schedules`, `holidays` | clock in/out (insert), list own logs, file correction/overtime request |
| `services/leaves.ts` | `leave_types`, `leave_balances`, `leave_requests` | list types/balances, file request (insert), cancel while pending (update) |
| `services/payslip.ts` | `payslips`, `payroll_periods`, `payroll_items` | list own payslips, get one detail |
| `services/benefits.ts` | `benefits`, `hmo_plans`, `employee_benefits`, `hmo_dependents`, `loans`, `loan_applications`, `loan_amortization` | read enrolled benefits, HMO dependents, loan balances/schedule |
| `services/documents.ts` | `documents`, `document_categories`, `document_versions`, `document_shares` | list own + shared docs, upload (insert + Storage) |
| `services/performance.ts` | `review_cycles`, `employee_reviews`, `review_scores`, `employee_goals`, `improvement_plans` | list own reviews, submit self-review (update while `status='self_review'`), goal CRUD |
| `services/expenses.ts` | `expense_claims`, `expense_categories`, `receipts`, `reimbursements` | file claim + receipt upload, edit while draft/submitted |
| `services/notifications.ts` | `notifications`, `notification_preferences` | list own (`recipient_id`), mark read, update preferences |

Each hooked up via a matching `hooks/use<Domain>.ts` using TanStack Query
(`useQuery`/`useMutation`), same pattern as `App.tsx`'s existing
`QueryClient` setup — no new state-management library needed.

---

## Phases

### Phase 1 — Real Auth + Employee Identity Resolution — DONE (2026-09-01)

Wire Supabase Auth sign-in/sign-out/session persistence. Build
`useAuth()`. Handle the "authenticated, no employee row" case explicitly.
Reduce `authStore.ts` to UI-only state. **Blocks every other phase** — do
this first, before any domain wiring.

**Status: done, `tsc`/`npm run build` both pass clean.** `lib/supabase.ts`,
`context/AuthContext.tsx` (real session + `noEmployeeRecord` state),
`hooks/useAuth.ts` rewritten, `authStore.ts` trimmed to `darkMode` only,
all direct `useAuthStore` consumers (`Navbar`, `Sidebar`, `DashboardPage`)
switched to `useAuth()`, `LoginPage`/`ChangePasswordPage` (both copies)/
`ForgotPasswordPage` wired to real `supabase.auth.*` calls.

**Found and fixed live**: every `employees` row had `user_id = NULL` — no
real account could sign in as an employee, because nothing has ever linked
an `auth.users` account to an `employees` row (that's a separate
"invite employee to portal" feature that doesn't exist yet on the admin
side — not in this app's scope). Also found and fixed the
`employee_employment`/`departments`/`positions` self-access RLS gap
documented above. **User-approved test linkage**: `employees` row
`964fe818-a246-4bf4-aca9-514864ebcaed` (work_email
`peter@peterpaullazan.com`, already matching by email) linked via
`user_id` to that same real `auth.users` account, so a real login can
actually be tested end-to-end. This is a real, permanent data change on
the live project, not a disposable test fixture — revisit if it needs
unwinding once a real invite flow exists.

**`role` mapping deferred**: `EmployeeUser.role` (`employee`/`manager`/
`team_lead`) has no real schema equivalent yet — every real account
defaults to `'employee'`. `mustChangePassword` also defaults to `false` —
no real schema signal for it was found. Neither blocks anything currently
built (nothing branches UI on `role` yet), but flag before building
anything that would.

### Phase 2 — Profile + Attendance

Wire `services/profile.ts` and `services/attendance.ts`. Clock-in/out is a
real `INSERT` into `attendance_logs` guarded by `self_insert_attendance`.
Verify `overtime_requests`/`attendance_corrections` have (or get) a
matching self-access policy before wiring those two sub-features.

### Phase 3 — Leaves

Wire `services/leaves.ts`. Leave request cancellation must respect
`self_update_leave_request`'s existing `status = 'pending'` guard —
attempting to cancel an already-approved request will correctly fail at
the RLS layer; surface that as a real UI message ("This request has
already been approved and can no longer be cancelled"), don't let it
surface as a generic error toast.

### Phase 4 — Payslip + Benefits

Wire `services/payslip.ts` (read-only, `self_select_payslip` already
covers it). For `services/benefits.ts`: write and apply self-access RLS
policies for `employee_benefits`, `hmo_plans`, `hmo_dependents`, `loans`,
`loan_applications`, `loan_amortization` first (none confirmed to exist
yet), following the exact `employee_id IN (SELECT id FROM employees WHERE
user_id = auth.uid())` pattern already used everywhere else — then wire the
service.

### Phase 5 — Documents

Wire `services/documents.ts`. Upload needs real Supabase Storage (bucket
TBD — check whether `hris-admin-dashboard` already has one for `documents`
before creating a second). `document_versions` self-access policy needs
verification/creation.

### Phase 6 — Performance

Wire `services/performance.ts`. **Higher-risk phase** — `employee_reviews`
has a real, narrow self-update policy (`status = 'self_review'` only,
matching a specific workflow state) that the UI must respect exactly:
self-assessment is only editable during that one status, not just "when a
review exists." `employee_goals`/`improvement_plans`/`review_scores` need
their own self-access policies written — check with real data (there are
currently 0 rows in any of these tables) rather than assuming the intended
shape from the mock JSON alone.

### Phase 7 — Expenses

Wire `services/expenses.ts`. Claim edit must respect
`self_update_expense_claim`'s `status IN ('draft','submitted')` guard,
same pattern as leaves. Receipt upload needs Storage, same
bucket-strategy question as Phase 5.

### Phase 8 — Notifications + Settings

Wire `services/notifications.ts`. `notification_preferences` needs a
self-access policy (none confirmed). Settings page's dark-mode toggle
needs no backend change (already local UI state) — only the notification
preferences and password-change sections are real backend work here.

### Phase 9 — Dashboard Aggregation (Today Strip, real data)

Depends on Phases 2–8 being done. The Today Strip's "most urgent item"
selection logic (built against mock data in Frontend Phase 2) gets swapped
for a real query: today's attendance status (Phase 2) plus the single
soonest-deadline item across pending leave requests (Phase 3), unviewed
payslips (Phase 4), and unread high-priority notifications (Phase 8) —
whichever is soonest/most urgent wins. This is the last phase before
Frontend Phase 7 (Integration Audit).

---

## Known Gotchas

- **Supabase RLS + `RETURNING`**: a chained `.select()` after
  `.insert()`/`.update()` requires the row to *also* pass a `SELECT`
  policy, even when the write policy is correct. Every `self_insert_*`
  table above already has a matching `self_select_*` policy, so this
  should be fine everywhere self-access is used — but the tables getting
  *new* policies in Phases 4/5/6/8 need both a write policy AND a read-back
  policy written together, not just the write half.
- **`employees.user_id` may be null** for an `auth.users` row that isn't
  actually an employee (e.g. an HR-only admin account). Every
  identity-resolution query must handle zero rows, not assume one always
  exists.
- **Status-gated self-updates**: `leave_requests`, `expense_claims`, and
  `employee_reviews` all restrict self-`UPDATE` to a specific status value.
  Trying to "just add an edit button" without checking current status first
  will silently fail at the RLS layer (0 rows affected, no thrown error
  from a plain Supabase update unless you check `.error`/the returned row
  count) — always check the row's status client-side before showing an
  edit affordance, and always check the actual update result, not just
  that the call didn't throw.
- **Mock data uses camelCase + short ids** (`emp001`, `leaveType`); real
  Supabase rows are snake_case with real UUIDs. Every service function is a
  mapping boundary — don't let camelCase leak from mock fixtures into the
  real service layer's types.
- **Turborepo/pnpm workspace**: adding `@supabase/supabase-js` as a new
  dependency here requires the same lockfile-commit step that bit the
  `hris-admin-dashboard` Vercel deploy earlier this project (forgot to
  commit `pnpm-lock.yaml` after `pnpm install`, broke the frozen-lockfile
  CI install) — commit the lockfile in the same commit as the
  `package.json` change, every time.

## Security Shortcuts (flag before shipping, don't silently absorb)

- **No rate limiting** on clock-in/leave-filing/expense-submission from
  this app — an employee could theoretically script repeated inserts.
  `hris-admin-dashboard`'s backend doesn't have this either currently, so
  this isn't a regression, but it's a real gap worth a explicit decision
  (accept the risk for now vs. add a `rate_limits`-table-backed check,
  which already exists as a table and is used elsewhere in this schema).
- **File uploads (documents, receipts)**: no virus/content-type scanning
  planned in Phases 5/7 — relying on Supabase Storage's own MIME-type
  restriction at the bucket level. Acceptable for an internal HR tool with
  a small, known user base; call this out explicitly if this app's user
  base ever grows beyond "employees of paying HRISPH customers."
- **Password change / forgot-password flows**: reuse Supabase Auth's
  built-in email flow (same as `hris-admin-dashboard` and `landing-page`
  already do) rather than a custom implementation — do not build a custom
  password-reset flow for this app.
