# BACKEND_IMPLEMENTATION.md — hris-admin-dashboard Bug-Fix Plan

**Scope:** New Supabase migrations/RPCs required to fix the P0 bugs from `ADMIN_DASHBOARD_AUDIT.md` that cannot be fixed on the frontend alone. This is a bug-fix project on a live schema — no new tables, only 2 new RPC functions, both following the existing `create_organization()` / `setup_invited_user()` SECURITY DEFINER pattern already used in this codebase (`20250501000001...sql`, `20250505000020_invite_and_team_rpcs.sql`).

Everything else in the audit (Payroll wiring, Holidays, Documents, Benefits formulas, RoleGuard, 2FA, Schedule delete, Leave apply/cancel) is pure frontend work against the **existing** schema — see `FRONTEND_IMPLEMENTATION.md`. Nothing in this file duplicates that.

---

## ⚠️ Blocking decision before Phase B1 starts

The audit's finding was: *"employee delete calls `supabase.rpc('delete_employees_hard', ...)`, a function that doesn't exist."* The literal fix implied by that function name is a **hard, cascading delete** across `employees` + 7 child tables (`employee_employment`, `employee_compensation`, `employee_government_ids`, `employee_bank_accounts`, `employee_emergency_contacts`, `employee_beneficiaries`, `employee_dependents`, all `ON DELETE CASCADE`) — and cascades further into every table with an `employee_id` FK: attendance logs, leave requests/balances, payroll runs, performance reviews, documents, etc.

**This is a real compliance risk, not just a technical one.** PH labor law (and most payroll audit requirements) expects employment/payroll records to be retained for years, not deleted. `employees` already has an `is_active` column (confirmed via `supabase-rls-fix.sql`'s data-repair step), which strongly suggests the product's intended model is soft-delete, and the RPC name is simply a leftover from an earlier draft.

**Recommendation (default, will implement unless told otherwise): implement `delete_employees_hard` as a soft-delete** — set `employees.is_active = false` (+ a new `deactivated_at`/`deactivated_by` audit pair) instead of removing rows. This keeps the existing frontend call signature working (same RPC name, same params) so no extra frontend rework is needed, while avoiding data loss. If true hard-delete is actually wanted (e.g. for GDPR/RA 10173 "right to erasure" requests), that should be a **separate, explicitly-invoked, admin-only "purge" operation with its own confirmation flow** — not the default action behind a list-page "Delete" button.

**Do not start Phase B1 until this is confirmed.**

---

## RPC surface (new)

| Function | Params | Returns | Security | Phase |
|---|---|---|---|---|
| `delete_employees_hard(p_employee_ids uuid[])` | array of employee IDs | `void` | `SECURITY DEFINER`, caller must be `admin`/`hr_admin` in the employees' organization | B1 |
| `approve_leave_request(p_request_id uuid, p_remarks text)` | request id, optional remarks | `leave_requests` row (updated) | `SECURITY DEFINER`, caller must be a manager/admin in the request's organization | B2 |
| `reject_leave_request(p_request_id uuid, p_remarks text)` | request id, optional remarks | `leave_requests` row (updated) | `SECURITY DEFINER`, caller must be a manager/admin in the request's organization | B2 |

Call convention matches the existing pattern already used in `services/organizations.ts` and `services/invitations.ts`: `supabase.rpc('function_name', { p_param: value })`.

---

## Schema this plan touches (existing tables — do not recreate, reference only)

**Employees domain** (`20250501000005_employee_database.sql`): `employees` (has `is_active boolean`), `employee_employment`, `employee_compensation`, `employee_government_ids`, `employee_bank_accounts`, `employee_emergency_contacts`, `employee_beneficiaries`, `employee_dependents`.

**Leave domain** (`20250501000008_leave_management.sql`):
```
leave_requests    (id, employee_id, organization_id, leave_type_id, start_date, end_date,
                    total_days, status['pending'|'approved'|'rejected'|'cancelled'|'withdrawn'],
                    approved_by, approved_at, remarks)
leave_balances    (id, employee_id, organization_id, leave_type_id, year,
                    entitled_days, used_days, pending_days, carried_over,
                    balance GENERATED = entitled_days + carried_over - used_days - pending_days)
                    UNIQUE (employee_id, leave_type_id, year)
leave_approvals   (id, leave_request_id, organization_id, approver_id, level,
                    status['pending'|'approved'|'rejected'], remarks, acted_at)
leave_credits_history (id, employee_id, organization_id, leave_type_id, year,
                    transaction_type['accrual'|'usage'|'adjustment'|'carry_over'|'expiry'],
                    days, reference_id, notes, created_by)
```

**Important sequencing note:** `leave_balances.pending_days` is only meaningful if something increments it when a request is *submitted*. That doesn't exist yet — it's frontend Phase F8 (`applyLeave()`) in `FRONTEND_IMPLEMENTATION.md`. Phase B2's RPC must therefore be defensive: on approve, decrement `pending_days` by `LEAST(pending_days, total_days)` and increment `used_days` by `total_days`, rather than assuming `pending_days` already correctly reflects this request (it may currently be 0 for every existing mock-era request). Do not write a version that fails or goes negative if `pending_days` is 0.

---

## Phase B1 — `delete_employees_hard` as soft-delete

**Migration file:** `backend/supabase/migrations/20260820000021_employee_soft_delete_rpc.sql`

1. Add columns to `employees`: `deactivated_at timestamptz`, `deactivated_by uuid references auth.users(id)` (if not already present — check first, don't assume).
2. Create `delete_employees_hard(p_employee_ids uuid[])`:
   - `SECURITY DEFINER`, `SET search_path = public`.
   - Verify every ID in `p_employee_ids` belongs to `get_my_org_id()` (reuse the existing helper from `supabase-rls-fix.sql`) — reject cross-tenant IDs rather than silently skipping them.
   - Verify caller's role via `get_my_role()`/`is_admin()` (existing helpers) — reject if not admin/hr_admin.
   - `UPDATE employees SET is_active = false, deactivated_at = now(), deactivated_by = auth.uid() WHERE id = ANY(p_employee_ids) AND organization_id = get_my_org_id();`
3. Grant `EXECUTE` to `authenticated` role only.

## Phase B2 — Leave approval RPCs

**Migration file:** `backend/supabase/migrations/20260820000022_leave_approval_rpcs.sql`

1. Create `approve_leave_request(p_request_id uuid, p_remarks text default null)`:
   - `SECURITY DEFINER`, `SET search_path = public`.
   - Look up the request; verify it belongs to `get_my_org_id()` and caller is admin/manager — reject otherwise.
   - Verify current `status = 'pending'` — reject (raise exception) if already approved/rejected/cancelled, so double-clicks or race conditions can't double-book the balance.
   - In one transaction: `UPDATE leave_requests SET status='approved', approved_by=auth.uid(), approved_at=now(), remarks=p_remarks WHERE id=p_request_id;`
   - `UPDATE leave_balances SET pending_days = GREATEST(pending_days - v_total_days, 0), used_days = used_days + v_total_days WHERE employee_id=v_employee_id AND leave_type_id=v_leave_type_id AND year=extract(year from v_start_date)::int;` — if no matching balance row exists yet, `INSERT` one first (an employee may not have a `leave_balances` row seeded for that type/year).
   - `INSERT INTO leave_approvals (leave_request_id, organization_id, approver_id, status, remarks, acted_at) VALUES (...)`.
   - `INSERT INTO leave_credits_history (employee_id, organization_id, leave_type_id, year, transaction_type, days, reference_id, notes, created_by) VALUES (..., 'usage', v_total_days, p_request_id, p_remarks, auth.uid());`
   - Return the updated `leave_requests` row.
2. Create `reject_leave_request(p_request_id uuid, p_remarks text default null)` — same guard checks, but only updates `leave_requests.status='rejected'` + inserts the `leave_approvals` row with `status='rejected'`. Does **not** touch `leave_balances` or `leave_credits_history` (nothing was ever deducted).
3. Grant `EXECUTE` on both to `authenticated`.

---

## Known Gotchas (Supabase-specific + this project's own rules)

- **RETURNING requires a SELECT policy too.** A chained `.select()` after `.insert()`/`.update()` (or an RPC that does the same internally) requires the affected row to also pass a SELECT RLS policy, even if the write policy is correct — if a "correct" write mysteriously returns no row, check this before assuming the write logic is wrong. Since both new functions are `SECURITY DEFINER`, they bypass RLS internally, but the **frontend's later `.select()` on the RPC's return value** (if any) is still subject to normal RLS as the calling user.
- **`supabase-rls-fix.sql` must be re-run** in the Supabase SQL Editor after these migrations are applied locally/staging, per this project's own existing deploy note in `WIRING_PHASES.md` — these new functions don't replace that file, they're additive.
- **Every query must stay scoped to `organization_id`** via `get_my_org_id()` (project rule, `WIRING_PHASES.md` rule 5) — both new RPCs must not trust a client-supplied `organization_id`, only ever derive it server-side.
- **Migration filenames must sort after the existing 20 migrations** — use a `2026...` prefix as shown above, not a `2025...` one, so `supabase db push` applies them in the intended order.

## Security Shortcuts (flag, don't silently ship)

- The soft-delete default in Phase B1 means **no actual hard-delete/purge capability exists after this phase**. If RA 10173 "right to erasure" support is a near-term requirement, that's an explicitly separate, not-yet-scoped feature — say so to the user rather than assuming this phase covers it.
- Neither new RPC currently rate-limits repeated calls. Given both are admin-only and low-frequency actions (not public-facing like the landing page's contact form), this is an accepted gap for now — call it out again if either RPC is ever exposed to a wider role.
