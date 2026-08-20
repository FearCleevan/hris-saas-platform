# CRUD_FIXES_FRONTEND_IMPLEMENTATION.md — Round 2 (CRUD-Correctness Fixes)

**Source of truth:** same CRUD audit as `CRUD_FIXES_BACKEND_IMPLEMENTATION.md` — read that file's intro before starting. 27 findings total; the 4 needing new SQL are covered there (B1–B4). This file covers the other 23, all pure frontend logic fixes.

## Adaptations from the standard protocol (same as round 1, read before Phase 1)

No Design Direction section — every fix reuses existing UI exactly as-is, no new screens or visual design. No mock-first ordering — this app already runs on `isSupabaseConfigured` real/mock branching everywhere; these phases plug into that existing pattern from the start.

## Phase order and dependencies

| # | Phase | Priority | Depends on |
|---|---|---|---|
| F1 | Fix document storage upload path (the critical bug) | CRITICAL | — |
| F2 | Employee creation: stop ghost rows + fix CSV error swallowing | CRITICAL | — |
| F3 | Employee update: fix silent department no-op + un-clearable bank account | HIGH | — |
| F4 | Employee bulk status: align "Terminated" with the real soft-delete semantics | HIGH | — |
| F5 | Team & Access: wire real deactivate/reactivate + fixed role-change + resend/double-click fixes | CRITICAL | Backend B1 |
| F6 | Schedule: persist color/departments/workDays, fix assignment bugs, retire the broken duplicate Shifts feature | CRITICAL | Backend B2 |
| F7 | Leave: rollback-safe apply, balance-sufficiency check | HIGH | Backend B4 (for reject; apply-side is pure frontend) |
| F8 | Offboarding: wire real completion → employee deactivation | CRITICAL | Backend B3 |
| F9 | Payroll: dispute text bleed, 'computed' status label, upload limit text, missing guards | MEDIUM | — |
| F10 | Dashboard: resolve the partially-live KPICards inconsistency | MEDIUM | — |
| F11 | Integration Audit (mandatory final phase) | — | all above |

Do F1 first regardless of anything else — it's the single highest-blast-radius bug (every document feature in the app is non-functional against real Supabase) and needs zero backend work.

---

## Phase F1 — Fix the document storage path bug

**Files:** `src/services/documents.ts` — `uploadSingleDocument` (~line 59), `uploadDocument` (~line 72), and the `getDocumentDownloadUrl` call sites use `filePath` values built the same wrong way.

**Root cause:** `storage.from('documents').upload(filePath, ...)` already selects the `documents` bucket. Building `filePath` as `` `documents/${orgId}/${employeeId}/${fileName}` `` makes the actual stored object name start with the literal segment `"documents"`, not the org ID — so `(storage.foldername(name))[1] = get_my_org_id()` in every RLS policy on this bucket (`20250501000019_storage.sql:53-74`) never matches. Every real upload/read/delete against this bucket has been failing.

**Steps:**
1. In `uploadSingleDocument`, change `filePath` from `` `documents/${orgId}/${employeeId}/${fileName}` `` to `` `${orgId}/${employeeId}/${fileName}` ``.
2. In `uploadDocument` (the generic Phase-F10-round-1 upload function), same fix: `` `${orgId}/${scope}/${fileName}` `` (drop the leading `documents/`).
3. Grep the whole file for any other `` `documents/${orgId}` `` string construction and fix identically — do not assume these two are the only occurrences, verify.
4. No changes needed to `getDocumentDownloadUrl` itself (it just signs whatever `filePath` it's given) — it will work correctly once the paths it's given are correct.
5. **This does not require a data migration.** Since every prior real upload attempt against configured Supabase would have thrown at the `.storage.upload()` call (before the DB insert), no `documents` rows exist pointing at wrongly-pathed objects — there's nothing to backfill.

---

## Phase F2 — Employee creation: stop ghost rows, fix CSV error swallowing

**Findings addressed:**
- CRITICAL — `services/addEmployee.ts:87-285`: the `employees` row is inserted first and committed; steps 2–10 (employment, compensation, gov IDs, bank, emergency contact, beneficiaries, documents) are separate un-transacted calls. A failure at any later step leaves a permanently-visible "ghost" employee (blank department/position/salary) with no way to fix or remove it from the UI.
- HIGH — `pages/employees/BulkUploadPage.tsx:147-160`: `catch { failed++; }` discards the actual thrown error — never logged, never shown — while the toast tells the user to "check console for details," which was never written to. Combined with the ghost-row bug, a failed CSV row can leave an untraceable ghost employee with zero diagnostic information.

**Steps:**
1. `addEmployee.ts`: wrap steps 2–10 in a `try { ... } catch (err) { await supabase.from('employees').delete().eq('id', newEmployeeId); throw err; }` — a compensating rollback. Not a true DB transaction (this codebase doesn't wrap multi-table writes in RPCs elsewhere either — matches the existing pattern rather than introducing a new one), but it removes the ghost row instead of leaving it, which is the actual user-facing bug.
2. `BulkUploadPage.tsx`: add `console.error('Row', i, 'failed:', err)` inside the catch (or better, collect `{row, error}` pairs and show them in a results panel/downloadable error CSV — check whether this page already has any results-summary UI to extend before building a new one). At minimum, make the toast's claim ("check console") true.
3. Since step 1 now cleans up ghost rows automatically, most CSV row failures should no longer leave orphaned records at all — verify this end-to-end (intentionally fail one row, e.g. malformed data, and confirm no employee row survives).

---

## Phase F3 — Employee update: fix silent department no-op + un-clearable bank account

**Findings addressed:**
- HIGH — `services/employees.ts:483-501`: `updateEmployee` only sets `department_id`/`position_id`/`employment_type_id` `if (deptRes.data?.id)` etc. — i.e. only if that department/position/type already exists as a row for the org. `EditEmployeePage.tsx:796` falls back to a generic hardcoded `STATIC_DEPARTMENTS` list when the org has zero departments seeded; picking one of those causes the lookup to return `null`, and the update **silently skips that field** — no error, "Save Changes" reports success, but the DB is unchanged, contradicting what the Preview step showed.
- HIGH — `services/employees.ts:527-562`: bank sync only runs `if (payload.bankName && payload.accountNumber)`. Blanking both fields to remove a bad bank entry causes the sync to be skipped entirely — the old row survives, and reloading the form shows the "cleared" values still populated, because there's no delete path.

**Steps:**
1. `updateEmployee`: when a department/position/employment-type name doesn't resolve to an existing row for the org, **create it** (matching what `addEmployee.ts` already does for new employees — reuse that exact lookup-or-create logic rather than writing a second version of it) instead of silently skipping the field. This makes `STATIC_DEPARTMENTS`-fallback selections actually work.
2. Bank sync: change the guard so that blank `bankName`/`accountNumber` (both empty) triggers a **delete** of the existing `employee_bank_accounts` row for that employee, rather than a no-op. Populate-both still upserts as today.
3. Verify the Preview step's "Changed" diff (mentioned in the original NewEmployeePage audit) reflects these corrected behaviors — if the diff is computed client-side against what will actually be sent, it should already be accurate once the underlying save logic is fixed; just confirm, don't rebuild the diff logic.

---

## Phase F4 — Employee bulk status: align "Terminated" with real soft-delete semantics

**Finding addressed:** HIGH — `services/employees.ts:601-665` (`bulkUpdateEmployees`) sets only `employees.status`, never `is_active`. `delete_employees_hard` (the actual soft-delete RPC from round 1) sets **both**. Result: bulk-marking someone "Terminated" from the list toolbar leaves `is_active=true`, so they keep appearing in every `getEmployees()`-backed view/picker as if still employed — two different, inconsistent definitions of "terminated" exist side by side in the same app.

**Steps:**
1. In `bulkUpdateEmployees`, when the bulk status update sets `status = 'terminated'` specifically (not other status values like `'on_leave'`, which should behave as today), also set `is_active = false` — and set `deactivated_at`/`deactivated_by` for consistency with the RPC path.
2. Consider (and flag rather than silently decide): should this call `delete_employees_hard` instead of duplicating its logic inline? Reusing the RPC keeps the "what does terminating someone actually do" logic in one place. Default to calling the RPC for consistency unless bulk-selecting many employees makes a single RPC call with an array meaningfully better than N individual calls — check whether `delete_employees_hard` already accepts an array (it does, `p_ids UUID[]`) before deciding; if so, this is a straightforward one-call replacement, not N calls.

---

## Phase F5 — Team & Access: real deactivate/reactivate, fixed role-change, resend/double-click fixes

**Depends on:** Backend Phase B1.

**Findings addressed:**
- CRITICAL — `handleToggleMemberStatus` (`SettingsPage.tsx:267-273`) calls nothing real.
- CRITICAL — `changeUserRole` (`services/invitations.ts:194-198`) always throws `'Role not found'` against real data.
- MEDIUM — role change non-atomic (fixed server-side by B1, but the frontend call site needs updating to use the new RPC instead of the old delete-then-insert calls).
- HIGH — `handleResendInvite` (`SettingsPage.tsx:254-265`) uses the *global* invite-form's role/org state instead of the specific invitation's own `inv.role`/`inv.organizationId`, and will always 409 on a same-org resend since the edge function blocks duplicate pending invites for the same email+org.
- MEDIUM — double-click "Send Invite" (`SettingsPage.tsx:646-651`) has no disabled guard, can create duplicate invite rows (no DB unique constraint backstops it).
- LOW — double-click "Revoke" (`SettingsPage.tsx:696-698`) has no per-row loading state, throws a spurious "Invite not found" on the second click.

**Steps:**
1. `services/invitations.ts`: replace the direct-query `changeUserRole` with a call to the new `change_user_role` RPC (Backend B1). Delete the now-dead delete-then-insert code.
2. `services/invitations.ts`: add `deactivateMember(userId)`/`reactivateMember(userId)` calling the new B1 RPCs.
3. `SettingsPage.tsx`: wire `handleToggleMemberStatus` to actually call the above, with the existing optimistic-update-then-rollback-on-failure pattern already used elsewhere in this file (`loadTeamData()` on catch) — match that established convention.
4. `handleResendInvite`: pass the specific invitation row's own `role`/`organizationId`, not the global form state. Given the edge function will still 409 on a genuinely-still-pending same invite (which is correct behavior — you can't "resend" without either revoking first or the backend supporting a proper resend-in-place), either (a) have Resend call Revoke-then-re-Invite as two steps using the invite's own original details, or (b) surface the 409 as an honest "This invite is still pending — revoke it first if you want to send a new one" message instead of a raw error. Pick (a) if straightforward given the existing revoke/invite functions; flag if it turns out more involved than expected.
5. Add `disabled={sendInvite.isPending}` (or equivalent) to the Send Invite button, and a per-row pending/loading state to Revoke buttons, matching patterns already used elsewhere in this codebase (e.g. `LeavesPage.tsx`'s per-action `isPending` checks from round 1).

---

## Phase F6 — Schedule: persist color/departments/workDays, fix assignment bugs, retire the broken duplicate Shifts feature

**Depends on:** Backend Phase B2.

**Findings addressed:**
- CRITICAL — color/departments/workDays silently dropped (fixed server-side by B2; this phase wires the frontend to actually send/read them).
- HIGH — `updateScheduleAssignments` (`services/attendance.ts:402-429`) only ends assignments for the schedule being edited, never the employee's *previous* schedule if they're moving from a different one — can leave an employee double-booked on two concurrent `is_current=true` schedules.
- HIGH — the same function is non-atomic (end-then-insert as two calls); a failure between them can strip every previously-assigned employee down to zero current schedule with only a generic "Failed to save shift" error.
- HIGH — `AttendancePage.tsx:13,98,1387`: a **separate, duplicate** Shifts feature on the Attendance page (distinct from `SchedulePage.tsx`'s, which works correctly) is wired to the static mock `employeesData` (`emp001`-style IDs) instead of `useEmployees()`. Any real save attempt through this surface sends a non-UUID string into a UUID column and fails outright.

**Steps:**
1. `createSchedule`/`updateSchedule`: read/write `color`, `departments`, `work_days` to/from the new columns instead of only echoing them on the in-memory return value. Remove `normalizeSchedule()`'s array-index color fallback and hardcoded `Mon-Fri` default now that real values exist — keep sensible defaults only for genuinely new/never-saved records.
2. `updateScheduleAssignments`: before ending assignments scoped to the target schedule, first find and end any `is_current=true` row for each incoming employee ID **regardless of which schedule it currently points to** (a query across `employee_schedules` filtered by `employee_id IN (...) AND is_current = true`, not `schedule_id = ...`). This directly fixes the double-booking bug.
3. Reduce the atomicity risk from step 2: at minimum, sequence the operations so that "end old assignments" happens for the specific incoming employee list only immediately before inserting their new rows (per-employee), rather than bulk-ending everyone-on-this-schedule first — this shrinks the window where a mid-failure leaves employees with zero current schedule, even without a full DB transaction. If a genuinely atomic fix is wanted, flag that as a candidate for a future RPC rather than expanding this phase's backend scope now.
4. `AttendancePage.tsx`'s duplicate Shifts feature: given `SchedulePage.tsx` already has a correct, working equivalent, the cleanest fix is likely **removing** the Attendance-page Shifts tab/modal entirely and pointing users to Schedule instead, rather than fixing a second parallel implementation of the same feature. Flag this as a scope decision before deleting UI — confirm whether both were ever intentionally meant to coexist (e.g. different permission levels) before removing one.

---

## Phase F7 — Leave: rollback-safe apply, balance-sufficiency check

**Depends on:** Backend Phase B4 (reject-side fix; this phase's apply-side and validation work is pure frontend).

**Findings addressed:**
- MEDIUM — `applyLeave()` (`services/leaves.ts:230-275`) is two non-atomic writes (insert request, then separately update balance); if the balance step throws after the request insert succeeds, the function still rejects and shows an error toast — but a real `pending` request now exists in the DB. The admin, believing submission failed, may resubmit and create a duplicate.
- MEDIUM — no validation anywhere (`applyLeave()`, `NewLeaveRequestModal`, or the approval RPCs) checks that `remaining >= totalDays` before creating or approving a request — an admin can drive an employee's balance negative with no client or DB guard.

**Steps:**
1. `applyLeave()`: if the balance-update step fails after the request insert succeeded, do not leave the caller thinking nothing happened — either (a) delete the just-inserted `leave_requests` row as a compensating rollback (matching the pattern from Phase F2), or (b) catch the balance-step error, log it, but still resolve successfully since the request itself IS real and valid (a `pending_days` miscount is arguably less bad than a duplicate request) — pick (a) for consistency with how F2 handles the same class of problem, unless there's a reason balance drift is preferable to rollback here.
2. Add a balance check in `NewLeaveRequestModal` (client-side, informational — block submit with a clear message if `totalDays > remaining balance for that leave type/year`, fetched via the existing `useLeaveBalances()` hook) — this is a UX guard, not a security boundary.
3. Consider whether `approve_leave_request` (existing RPC) should also refuse approval when it would drive balance negative — flag as an option; the original spec never called for hard leave-balance enforcement, so treat this as a "nice to have if cheap" rather than mandatory for this phase, and note the decision either way in the phase report.

---

## Phase F8 — Offboarding: wire real completion → employee deactivation

**Depends on:** Backend Phase B3.

**Finding addressed:** CRITICAL — offboarding completion never deactivates the employee (see B3 for the root fix).

**Steps:**
1. In `services/offboarding.ts`, wherever clearance/final-pay updates currently lead to the UI showing "Completed" (the functions that update `clearance_progress`/whatever tracks final pay status), after the update, check if the record is now complete and — if so — call the new `complete_offboarding` RPC.
2. Since B3's RPC re-derives completion server-side rather than trusting the client, it's safe to call this speculatively (e.g., after every clearance-item toggle, check-and-call) — the RPC will simply no-op/raise if not actually complete yet. Confirm the exact error-vs-no-op behavior designed in B3 and handle it as a silent no-op on the frontend (don't surface an error toast for "not complete yet," only for genuine failures).
3. Verify: complete an offboarding record end-to-end and confirm the employee disappears from `EmployeeListPage`'s default (active-only) view immediately after, without a manual refresh — same verification pattern as round 1's employee-delete fix.

---

## Phase F9 — Payroll: dispute text bleed, 'computed' status label, upload limit text, missing guards

**Findings addressed:**
- MEDIUM — `PayrollPage.tsx:936,943`: opening the Resolve/Reject box for a different dispute without submitting the first leaves stale `resolutionText` pre-filled, risking a resolution note written for the wrong record.
- MEDIUM — `services/payroll.ts:91-93`: DB status `'computed'` maps to UI `'draft'`, hiding that a run was already computed (and its `computed_at`/`computed_by` metadata) and mislabeling it.
- LOW-MEDIUM — `DocumentsPage.tsx:396-401`: no client-side file validation, and the displayed "Max 10MB" text is simply wrong (real bucket limit is 50MB with MIME restrictions, per `20250501000019_storage.sql:10`).
- LOW — `PayrollPage.tsx:924-930`: dispute "Review" button has no pending-state guard, unlike the Resolve/Reject buttons.

**Steps:**
1. Reset `resolutionText` to `''` whenever `setResolvingId` changes to a different dispute (or when opened) — a one-line fix in the `onClick` handlers or a `useEffect` keyed on `resolvingId`.
2. Decide how to represent `'computed'` in the UI: either add it as a genuine 5th `WORKFLOW` stage (bigger change, matches the DB exactly) or at minimum stop mapping it to `'draft'` — map it to a distinct label ("Computed") with its own badge color, even without a dedicated workflow button, so it's not actively mislabeled. Default to the smaller fix (distinct label, no new workflow stage) unless full parity is wanted — flag the choice made.
3. `DocumentsPage.tsx` upload tab: add a client-side check (file size ≤ actual bucket limit, correct MIME allowlist) before calling `upload.mutateAsync`, with a clear inline error if it fails the check. Fix the displayed limit text to match the real bucket config. Note: different buckets have different limits (`documents`=50MB, `receipts`=10MB, etc.) — this phase only touches the Documents module's bucket; don't assume the same limit applies elsewhere.
4. Add `disabled={review.isPending}` to the dispute "Review" button, matching the pattern already used on Resolve/Reject.

---

## Phase F10 — Dashboard: resolve the partially-live KPICards inconsistency

**Finding addressed:** `DashboardPage.tsx`/`KPICards.tsx` call `useEmployeeStats()`, which hits real Supabase when configured — while every sibling widget (`ActivityFeed`, `AnnouncementBoard`, `AttendanceHeatmap`, `DepartmentChart`, `PendingApprovals`, `QuickStats`, `UpcomingEvents`) stays 100% mock. In any environment with real (non-demo) data, the KPI row and the rest of the dashboard can visibly disagree (e.g. real employee count vs. a mock-derived department breakdown).

**⚠️ Decision needed, not a clear-cut bug fix:** two valid directions —
- **(a)** Revert `KPICards` to mock too, for internal consistency, until the rest of the dashboard is wired (matches this app's own stated Phase 14 scope, which hasn't started).
- **(b)** Leave `KPICards` live and treat this as the *first slice* of Phase 14 — but then the honest fix is auditing whether any OTHER dashboard widget can cheaply also go live (e.g. `DepartmentChart` could plausibly use the already-fetched `useEmployees()` data instead of the mock import) rather than leaving a half-live page.

Default recommendation: **(a)**, since it's the smaller, safer change and doesn't expand this bug-fix round into starting Phase 14's real scope. Flag if (b) is preferred instead — that changes this phase's steps meaningfully.

**Steps (assuming (a) is chosen):**
1. Revert `KPICards.tsx`'s data source to the same mock-only pattern as its siblings, removing the `isSupabaseConfigured` branch in `useEmployeeStats()` usage here specifically (or simplest: have `KPICards` read from the mock JSON directly like the other widgets do, bypassing the hybrid hook for this consumer only) — confirm this doesn't break `EmployeeListPage`'s own legitimate use of `useEmployeeStats()`, which should stay real.

---

## Phase F11 — Integration Audit (mandatory final phase)

1. `grep -r "data/mock/" src/` across every file touched in F1–F10 — confirm no lingering references to data sources that are now supposed to be fully consistent (especially re-check Dashboard after F10's decision).
2. Confirm every new/changed function still follows Rule 2 (Supabase path + mock fallback) and Rule 3 (`staleTime`, correct query-key invalidation) from round 1's conventions.
3. Specifically re-verify the two "non-atomic write, partial failure" fixes (F2's ghost-row rollback, F7's leave-apply rollback) by deliberately forcing a downstream failure in a local/test environment and confirming no orphaned rows survive.
4. Run `npx tsc --noEmit` and `npm run build` — both must pass with zero errors.

---

## UI states to handle

Same standard as round 1 — every newly-error-surfacing path (F1 upload errors, F2 CSV row failures, F5 role-change/deactivate failures) needs a real, specific toast message, not a generic "Something went wrong."

## Known Gotchas

Same as `CRUD_FIXES_BACKEND_IMPLEMENTATION.md`'s list — read that file too, especially the `storage.foldername()` indexing note, since Phase F1 is exactly that bug.

## Security Shortcuts to flag if encountered

- F5's deactivate cannot force-expire existing sessions (documented in B1) — don't let this get lost when wiring the frontend; the UI copy for "Deactivate" should probably say something like "blocks new sign-ins immediately; existing sessions expire within the hour" rather than implying instant effect.
- F6's assignment-atomicity fix is a mitigation (smaller failure window), not a full fix (no DB transaction) — say so in the phase report rather than claiming it's fully atomic.

---

**Files generated. Shall I begin Phase F1 (the critical document storage path fix — no backend dependency, can start immediately)?**
