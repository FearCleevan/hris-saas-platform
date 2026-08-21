# CRUD Fixes — Manual QA Checklist

Covers round-2 CRUD-correctness fixes (Phases F4–F11, Backend B1–B4) plus the
new My Profile feature. All items require a real Supabase connection (check
`.env` has `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` pointing at the
project where migrations B1–B4 were applied) — demo/mock mode won't exercise
any of these code paths.

**How to use:** work top to bottom, check items off as you confirm them.
Anything that fails, note the exact steps + what you saw instead — that's
what I'll need to fix it.

---

## Setup

- [ ] `cd apps/hris-admin-dashboard && npm run dev`, app loads at the printed
      localhost URL
- [ ] Logged in as a **Super Admin** (most items below require it — Team &
      Access, Payroll, and role-change specifically need `super_admin`)
- [ ] Have at least: 2 team members (one you can safely deactivate/reactivate
      for testing), 1 pending invite, 1 employee with an active leave
      balance, 1 offboarding record you can push through to completion, 2+
      open payroll disputes, 1 payroll run

---

## 0. My Profile (new — not part of the original CRUD audit, added today)

- [ ] Click your avatar (top-right) → **My Profile** — lands on an actual
      profile page (not silently back on Settings' Company tab)
- [ ] **Change Password**: enter a *wrong* current password → error toast
      "Current password is incorrect", nothing changes
- [ ] **Change Password**: enter the *correct* current password + a new
      password (8+ chars) + matching confirm → success toast, fields clear
- [ ] Log out, log back in with the **new** password → succeeds
- [ ] **Change Email**: enter a different email → toast about a confirmation
      link being sent; check the new address's inbox for it (your login
      email won't actually change until that link is clicked)
- [ ] Header card shows your correct name, role, and org

---

## F4 — Bulk employee termination

- [ ] Employees list → select 2+ employees → bulk action → set status to
      **Terminated**
- [ ] Reload the page: those employees no longer appear in the default
      (active-only) employee list
- [ ] Open one of them directly (or check via a picker elsewhere, e.g. new
      leave request's employee dropdown) — confirm they're excluded there too

## F5 — Team & Access (Settings → Team & Access)

- [ ] Click **Deactivate** on a team member → button flips to "Reactivate",
      row dims, toast confirms
- [ ] Reload the page — the deactivated state persists (not just local state)
- [ ] Click **Reactivate** → flips back, persists on reload
- [ ] Try deactivating **every** super_admin down to the last one — the last
      one should refuse with a clear error, not succeed
- [ ] Change a member's **role** via the Role button/dropdown → persists on
      reload, no "Role not found" error
- [ ] Send a new invite → appears in Pending Invitations
- [ ] Click **Resend** on that same pending invite → succeeds (should
      revoke + resend, not error with "invitation already exists")
- [ ] Click **Revoke** on a pending invite, then immediately double-click it
      again fast → no duplicate error, no crash
- [ ] Click **Send Invite** and rapid-double-click it → doesn't fire twice /
      create two invite rows

## F6 — Schedule

- [ ] Schedule page → create or edit a shift, pick a **color** and one or
      more **departments**, save
- [ ] Reload the page — color and departments are exactly what you set (not
      reverted to a default color or empty departments)
- [ ] Assign an employee to Schedule A, save. Then assign the **same
      employee** to Schedule B, save. Check Schedule A's assignment list —
      that employee should no longer be there (not double-booked on both)
- [ ] Confirm there's **no "Shifts" tab on the Attendance page anymore** —
      Attendance should only have Daily/Calendar/Reports/Overtime/Holidays

## F7 — Leave

- [ ] New Leave Request: pick an employee + leave type, enter a day count
      that **exceeds** their remaining balance for that type → submit button
      disables, red warning text shows the actual days remaining
- [ ] Submit a valid, in-range leave request → succeeds
- [ ] Reject a **pending** leave request → check that employee's Leave
      Balances (or their profile) shows `pending_days` **decreased** by the
      rejected request's day count, not still inflated
- [ ] (Optional, harder to force) If you can simulate a balance-update
      failure after a request is inserted, confirm no orphaned "ghost"
      pending request survives — not required to test, just noting it's the
      kind of thing to watch for if requests ever look duplicated

## F8 — Offboarding

- [ ] Open an offboarding record. Clear every clearance item, then release
      final pay (or vice versa — whichever order) so both reach their
      terminal state
- [ ] The moment the **second** one completes, go to Employee List (active
      view) **without refreshing** — the employee should already be gone
- [ ] Try triggering completion again on the same record (e.g. re-toggle a
      clearance item) — should not error or double-process oddly

## F9 — Payroll

- [ ] Payroll → Disputes tab: click **Resolve** on dispute A, type some
      text into the box, then — without submitting — click **Resolve** or
      **Reject** on a **different** dispute B → box for B should be empty,
      not pre-filled with A's text
- [ ] Click **Review** on an open dispute, then rapid-click it again →
      doesn't double-fire
- [ ] Find (or manually set in DB) a payroll run with real status
      `'computed'` — its badge should say **"Computed"**, not "Draft"
- [ ] Documents → Upload tab: try uploading a file **over 50MB** → blocked
      client-side with a clear message, never reaches the upload call
- [ ] Try uploading a disallowed file type (e.g. a `.zip` or `.mp4`) →
      blocked with a clear "unsupported file type" message
- [ ] Upload a valid PDF/JPEG/PNG/DOC/DOCX under 50MB → succeeds normally

## F10 — Dashboard

- [ ] Dashboard home: KPI cards (Total Employees, Present Today, etc.) and
      the header greeting ("X employees · Y active") show numbers that
      **don't change** no matter what real data is in Supabase — they
      should match the same static feel as ActivityFeed/QuickStats/other
      sibling widgets
- [ ] No console errors on dashboard load

## F11 — Integration audit (spot-checks)

- [ ] After any Team & Access action above, no stale/incorrect data lingers
      elsewhere in the app without a refresh (this was the specific bug
      class F11 caught — cache invalidation)
- [ ] General: open browser dev tools → Console tab while clicking through
      everything above — flag any red errors or unhandled promise
      rejections, even if the UI looked fine

---

## Reporting back

For anything that fails, give me: which checklist item, what you did, what
you expected, and what actually happened (plus a screenshot or console error
if there is one). I'll fix from there.
