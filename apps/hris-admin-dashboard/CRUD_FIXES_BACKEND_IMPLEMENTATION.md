# CRUD_FIXES_BACKEND_IMPLEMENTATION.md — Round 2 (CRUD-Correctness Fixes)

**Source of truth:** the CRUD audit run 2026-08-20 (4 parallel domain agents + one directly-verified critical finding). This is a bug-fix round on an app that already completed one full fix cycle (see `ADMIN_DASHBOARD_AUDIT.md`, `FRONTEND_IMPLEMENTATION.md`, `BACKEND_IMPLEMENTATION.md` — all executed, historical record, do not overwrite). This round goes deeper: not "is it wired to Supabase" but "does each Create/Read/Update/Delete actually behave correctly."

**Scope of this file:** only the 4 findings that genuinely need new SQL (new columns or new RPCs). Everything else is a frontend logic fix — see `CRUD_FIXES_FRONTEND_IMPLEMENTATION.md`. The critical storage-path bug (Finding #1) needs **no migration at all** — it's a one-line frontend path-construction bug — so it's phase F1 in the frontend file, not here.

---

## Phase B1 — Team & Access: real deactivate/reactivate + atomic role-change RPCs

**Findings addressed:**
- CRITICAL — `SettingsPage.tsx:267-273` `handleToggleMemberStatus` calls no service function at all; `user_profiles.is_active` is never touched despite `get_team_members` already reading it. Deactivated staff keep full access indefinitely.
- CRITICAL — `services/invitations.ts:194-198` `changeUserRole` filters `.is('organization_id', null)`, but roles are never created with a null org_id (`handle_new_user()` and `create_organization` both always scope `organization_id = v_org_id`). The lookup always returns 0 rows → always throws `'Role not found'`.
- MEDIUM — `services/invitations.ts:206-217` role change is a non-atomic delete-then-insert; a `.delete().match()` on zero rows succeeds silently, so a failed/raced first change can leave a user with two role rows (a stale one + a new one), granting a union of permissions.

**⚠️ Blocking question before this phase starts:** "Deactivate" can only reliably stop a user from being treated as active for *new* Supabase Auth token issuance/refresh (by having the deactivation check land in the `custom_access_token_hook` mentioned in `backend/supabase/DEPLOY.md`) — it **cannot** force-expire a JWT the user already holds client-side. Given `jwt_expiry = 3600` (1 hour, per `config.toml`), a just-deactivated user could retain working access for up to an hour after being deactivated. This is a real, inherent Supabase limitation, not something this phase can close — flagging it now rather than silently shipping "Deactivate" as if it's instant. Proceeding on the assumption this partial mitigation (block new/refreshed sessions) is acceptable; say so if immediate session kill is actually required (would need a different architecture — e.g. a server-side session/session-version check on every request).

**Migration file:** `backend/supabase/migrations/20260821000024_team_access_fixes.sql`

1. `deactivate_member(p_user_id uuid)` / `reactivate_member(p_user_id uuid)`:
   - `SECURITY DEFINER`, admin-only (`is_admin()`), scoped to `get_my_org_id()` — verify the target `user_profiles` row's `organization_id` matches before touching it.
   - Sets `user_profiles.is_active = false/true`.
   - Cannot deactivate the last remaining `super_admin` in an org (read `user_roles`/`roles` to check) — a genuine "don't lock yourself out" guard worth adding since nothing else in this app currently prevents it.
2. `change_user_role(p_user_id uuid, p_new_role_slug text)`:
   - `SECURITY DEFINER`, admin-only, org-scoped.
   - Look up the role row correctly: `WHERE organization_id = get_my_org_id() AND slug = p_new_role_slug` (fixing the root-cause `.is(..., null)` bug at the source, not just patching the frontend query).
   - In one transaction: delete the user's existing `user_roles` row(s) for this org, insert the new one. Being inside a single `plpgsql` function makes this atomic — the non-atomicity finding is inherently fixed by moving this server-side.
   - Raise a clear exception if `p_new_role_slug` doesn't exist for the org (surfaces a real error instead of the current silent 0-row no-op).
3. Grant `EXECUTE` on all three to `authenticated`.

**Frontend integration:** Phase F5 (`CRUD_FIXES_FRONTEND_IMPLEMENTATION.md`) wires `SettingsPage.tsx` to call these instead of the current broken/missing logic.

---

## Phase B2 — Schedule: add the missing `color`/`departments`/`work_days` columns

**Finding addressed:** CRITICAL — `services/attendance.ts:304-364` (`createSchedule`/`updateSchedule`). The `schedules` table (`20250501000007_attendance.sql:7-23`) has no `color`, `departments`, or `work_days` columns. The UI has always let admins pick these; they're silently discarded on every save and revert to arbitrary defaults on next refetch.

**Migration file:** `backend/supabase/migrations/20260821000025_schedule_columns.sql`

```sql
ALTER TABLE public.schedules
  ADD COLUMN IF NOT EXISTS color TEXT NOT NULL DEFAULT '#0038a8',
  ADD COLUMN IF NOT EXISTS departments TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS work_days TEXT[] NOT NULL DEFAULT '{Mon,Tue,Wed,Thu,Fri}';
```

No RLS change needed — `admin_write_schedules` already covers `UPDATE`/`INSERT` on the whole row via `FOR ALL`. `departments` stores department **names** (matching the existing frontend `ScheduleEntry.departments: string[]` shape) rather than a normalized FK array — consistent with what the UI has always assumed, not introducing a new data model mid-fix.

**Frontend integration:** Phase F6 updates `createSchedule`/`updateSchedule` to actually read/write these columns.

---

## Phase B3 — Offboarding: atomic completion RPC that actually deactivates the employee

**Finding addressed:** CRITICAL — `services/offboarding.ts` never updates `employees.is_active`/`status` anywhere. An offboarding record can reach `deriveOverallStatus() === 'completed'` (clearance 100% + final pay released) while the employee stays fully active and keeps appearing in `EmployeeListPage`, `OrgChartPage`, and every employee picker, indefinitely.

**Migration file:** `backend/supabase/migrations/20260821000026_complete_offboarding_rpc.sql`

`complete_offboarding(p_offboarding_id uuid)`:
- `SECURITY DEFINER`, admin-only, org-scoped.
- Reads the offboarding record's `clearance_status` and associated final-pay state; **re-derives completion server-side** rather than trusting a client-supplied "it's done" flag (the client's `deriveOverallStatus()` logic must be treated as a UI hint, not a security boundary — recompute the same condition in SQL).
- If genuinely complete: sets `offboarding_records.status = 'completed'` AND, in the same transaction, calls the existing `delete_employees_hard(ARRAY[p_employee_id])` logic (either by directly inlining the same `UPDATE employees SET is_active=false, status='terminated', deactivated_at=now(), deactivated_by=auth.uid()`, or by calling that function directly — reuse it, don't duplicate the logic).
- If not actually complete (client called this prematurely), raise a clear exception rather than silently no-op.

**Frontend integration:** Phase F8 calls this RPC at the point the UI currently just displays "Completed," instead of only updating local/derived UI state.

---

## Phase B4 — Leave: fix `reject_leave_request` to reverse the `pending_days` bump

**Finding addressed:** HIGH — `20260820000022_leave_approval_rpcs.sql`'s `reject_leave_request` was written before `applyLeave()` existed (a later phase in round 1 added it) and its own comment says "Rejecting never touches leave_balances — nothing was ever deducted." That was true when written; it's no longer true. `applyLeave()` now always increments `leave_balances.pending_days` on submission, and `reject_leave_request` never reverses it — every rejected request permanently inflates `pending_days`, silently under-reporting the employee's real remaining balance forever.

**Migration file:** `backend/supabase/migrations/20260821000027_fix_reject_leave_balance.sql`

`CREATE OR REPLACE FUNCTION public.reject_leave_request(...)` — same signature and guard logic as the existing function (org/role check, `FOR UPDATE` lock, pending-only guard), but add the same defensive balance decrement `approve_leave_request` already uses: `pending_days = GREATEST(pending_days - v_total_days, 0)`, looked up the same way (employee_id/leave_type_id/year). No `leave_credits_history` row on reject (still correct — nothing was ever "used").

**Frontend integration:** none needed — `services/leaves.ts`'s `rejectLeaveRequest()` already just calls the RPC; fixing the RPC body fixes the bug with zero frontend changes.

---

## Known Gotchas (carried over + new)

- Same Supabase gotcha as round 1: a chained `.select()` after `.insert()`/`.update()` requires the row to also pass a SELECT policy, even if the write policy is correct.
- **New this round:** `storage.foldername(name)` is 1-indexed and splits on `/` — when constructing a path to pass to `.storage.from(bucket).upload(path, ...)`, remember the bucket name is already selected by `.from()` and must NOT be repeated as the first segment of `path`, or every `(storage.foldername(name))[1] = org_id` RLS check silently shifts by one and rejects everything. This is exactly what Finding #1 (Phase F1) was.
- Migration filenames in this round start `2026082100...` — must sort after round 1's `2026082000...` files.

## Security Shortcuts

- Phase B1's "Deactivate" cannot force-expire an already-issued JWT — see the blocking question above. Treat as a known, accepted limitation of this architecture, not a bug to chase further in this round.
- Phase B3's `complete_offboarding` re-derives completion server-side specifically so a compromised/buggy client can't mark an incomplete offboarding as done and trigger a real employee deactivation — this is a deliberate trust-boundary decision, not incidental.
