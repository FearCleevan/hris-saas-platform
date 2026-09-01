# Employee Portal Web — Frontend Implementation Plan

## Overview

`employee-portal-web` (Vite + React 19 + TypeScript + MUI + Tailwind v4 + Zustand +
TanStack Query) is fully scaffolded — 12 route domains (dashboard, profile,
attendance, leaves, payslip, benefits, documents, performance, expenses,
notifications, settings, auth) — but every page reads from
`src/data/mock/*.json` and `src/store/authStore.ts`'s `login()` accepts an
arbitrary local object with no real Supabase Auth call at all.

**This plan covers two things together, per the scope decision made
2026-08-29:**

1. **Wire it to the real Supabase backend** already powering
   `hris-admin-dashboard` (project `ztpoqosyrcepvwwwnsar`) — same
   organization, same tables, RLS-scoped to the logged-in employee instead of
   an HR admin.
2. **Redesign it mobile-first.** `apps/employee-portal-mobile` (a
   never-started `.gitkeep` stub) has been removed — building and
   maintaining a second, duplicate UI in React Native for an app whose
   entire user base is "employees checking their phone" isn't worth it at
   this stage. `employee-portal-web` becomes the only ESS surface, designed
   mobile-first, responsive up to desktop, not a shrunk-down dashboard.

**Execution order** (both plan files together): **Frontend Phases 1–6**
(mobile-first redesign, mock data only, no backend calls) → **Backend
Phases 1–9** (see `BACKEND_IMPLEMENTATION.md`, real Supabase wiring, domain
group by domain group) → **Frontend Phase 7: Integration Audit** (final,
runs after backend phases are done). This keeps the discipline of "get the
UI right against safe mock data first," while still ending with a real,
fully-wired app.

---

## Design Direction

The brand isn't being invented here — `hris-admin-dashboard` and
`landing-page` already share a deliberate Philippine-flag-derived palette
(`lib/theme.ts`, already in this app too). Reusing it is the *correct* call,
not a shortcut: three apps in one product family with three different
palettes would be its own kind of slop. What's actually new in this phase is
the **mobile-first layout language** — that's where a genuine direction
decision is needed, and where the generic-AI-app trap (a bottom tab bar +
plain card list that could belong to any SaaS ESS clone) has to be avoided
deliberately.

- **Color** (existing, preserved): Primary `#0038a8` (PH flag blue), Secondary
  `#059669` (approval/positive green), Warning `#fcd116` (PH flag yellow —
  used for pending/urgent states), Error `#ce1126` (PH flag red), background
  `#f0f4ff` light / dark-mode equivalents already defined in `lib/theme.ts`.
- **Type**: Inter throughout (already set) — used at real weight contrast on
  mobile: 700 for the one number/status that matters on a card, 400 for
  everything else. No second display face is being introduced; the existing
  system doesn't need one, and adding one here would be a decision made for
  its own sake.
- **Layout concept**: a **persistent "Today Strip"** — one large, swipeable
  status card pinned to the very top of the Home screen, always showing
  *the single most time-sensitive thing* (current clock-in state if it's a
  work day, or the most urgent pending item — a leave request awaiting
  approval, a payslip ready to view, a leave credit about to expire). Below
  it, a 2×3 quick-action grid (Attendance, Leaves, Payslip, Benefits,
  Documents, More) sized for a thumb, not a mouse. Everything else (the
  remaining 6 domains) lives one tap under "More," not crammed into a
  5-item bottom bar.

  ASCII wireframe (Home, mobile viewport):
  ```
  ┌─────────────────────────────┐
  │  Navbar: avatar · name · 🔔  │
  ├─────────────────────────────┤
  │ ╔═══════════════════════╗   │  <- Today Strip (signature element)
  │ ║ 🟢 Clocked in 8:03 AM ║   │     swipe → next urgent item
  │ ║ 4h 12m today           ║   │
  │ ╚═══════════════════════╝   │
  ├─────────────────────────────┤
  │  [Attendance] [Leaves]      │  <- 2-col thumb grid, not a dense
  │  [Payslip]    [Benefits]    │     desktop-style menu list
  │  [Documents]  [More]        │
  ├─────────────────────────────┤
  │  Recent activity (3 items)  │
  └─────────────────────────────┘
  │ 🏠   ⏱️    🌴    🧾    ⋯   │  <- bottom tab bar, 5 items max
  └─────────────────────────────┘
  ```
- **Signature element**: the **Today Strip**. This is what makes the home
  screen feel like a real ESS product rather than a generic dashboard —
  it's the one place a first-time user's eye goes, and it directly answers
  "do I need to do anything right now," which a static stat-card grid
  doesn't.
- **Slop check**: this avoids all three defaults explicitly — no cream+serif
  editorial look, no near-black+neon dashboard look, no dense hairline-rule
  broadsheet look. The existing PH-flag palette is bold and specific to this
  product already; the Today Strip is the layout-level signature that keeps
  the *mobile* redesign from defaulting to "generic bottom-nav app #4,281."
- **Design skills invoked for this pass**: `ui-ux-pro-max` (mobile
  information-architecture patterns, touch-target sizing), `ui-styling`
  (MUI + Tailwind coexistence patterns already in use in this app),
  `design-system` (token reuse discipline across the three sibling apps).
  `frontend-design`/`design-taste-frontend` were checked but are aimed at
  net-new marketing/landing surfaces, not a redesign of an existing
  authenticated app shell — not a fit here, noted rather than silently
  skipped.

---

## Component Tree / Page Structure Changes

```
src/
  layouts/
    DashboardLayout.tsx      <- REPLACED: bottom tab bar + top Navbar,
                                 no more fixed 220px sidebar as primary nav
    MoreSheet.tsx             <- NEW: bottom-sheet listing the 6 non-tab
                                 domains (Benefits, Documents, Performance,
                                 Expenses, Notifications, Settings)
  components/
    layout/
      BottomTabBar.tsx        <- NEW (Home, Attendance, Leaves, Payslip, More)
      TodayStrip.tsx           <- NEW, the signature element
      QuickActionGrid.tsx      <- NEW
    ui/ (existing shared primitives, reused as-is)
  pages/
    dashboard/DashboardPage.tsx   <- rebuilt around TodayStrip + grid
    attendance/ ... leaves/ ... payslip/ ... etc.  <- each gets a mobile-
      first pass (single-column, bottom-sheet forms instead of modals,
      swipe/tap targets ≥44px) but keeps its existing page identity
```

Existing `Sidebar.tsx`/current `Navbar.tsx` are retired from primary
navigation but the Navbar's avatar/notification-bell pattern is kept at the
top of the new layout.

---

## Phase 1 — Mobile-First Shell & Navigation

**Scope**: Replace `DashboardLayout.tsx`'s sidebar-first structure with the
bottom-tab-bar shell. Build `BottomTabBar`, `MoreSheet`. Wire routing so all
12 existing routes still resolve — only the chrome around them changes.
Mock data untouched.

**UI states**: bottom bar active-tab indicator; `MoreSheet` open/closed;
nothing here has a loading/error state yet (no data fetching in this phase).

## Phase 2 — Home (Today Strip) + Profile

**Scope**: Build `TodayStrip` and `QuickActionGrid` against
`data/mock/shift.json` + `data/mock/leave-requests.json` +
`data/mock/payroll-records.json` (pick whichever mock row is most "urgent"
by date — this selection logic is what becomes real in Backend Phase 9).
Rebuild `MyProfilePage` mobile-first (stacked sections, not a dense
two-column desktop form) against `data/mock/profile.json`.

**Sample data**: reuse existing `profile.json`/`shift.json` as-is — already
realistic (real PH names, real leave-type codes), no placeholder copy needed.

**UI states**: Today Strip empty state ("No shift today — enjoy your day
off" — not "No data"); profile loading skeleton; avatar upload error state
with a real retry affordance.

## Phase 3 — Attendance + Leaves

**Scope**: Mobile-first `AttendancePage` (clock-in/out as a single large
thumb-reachable button, not a table-first view — the log becomes a
scrollable list below the fold) and `LeavePage` (leave request as a
bottom-sheet form, not a modal dialog — modals are a poor mobile pattern).
Mock data: `attendance-logs.json`, `overtime-requests.json`,
`correction-requests.json`, `leave-balances.json`, `leave-requests.json`,
`leave-types.json`.

**UI states**: pending-approval badge (warning yellow), rejected state with
the real rejection reason shown (not hidden behind a click), empty leave
history ("You haven't filed a leave yet this year").

## Phase 4 — Payslip + Benefits

**Scope**: `PayslipPage` as a card list (period, net pay, status) with a
detail sheet on tap, not a desktop table. `BenefitsPage` covering HMO,
government benefits, and loans as three mobile-first sections/tabs. Mock
data: `payroll-records.json`, `payroll-runs.json`, `hmo.json`,
`government-benefits.json`, `loans.json`.

**UI states**: payslip PDF-not-ready-yet state, loan balance progress bar,
HMO dependent list empty state.

## Phase 5 — Documents + Performance

**Scope**: `DocumentsPage` mobile-first file list with a bottom-sheet
upload flow (camera/file picker — this is one of the few places native
camera access would matter, noted for a future PWA capability check, not
built here). `PerformancePage` covering review cycles, self-assessment,
goals. Mock data: `my-documents.json`, `document-checklist.json`,
`document-requests.json`, `performance-reviews.json`,
`self-assessment.json`, `goals.json`, `feedback.json`.

**UI states**: document upload progress, self-assessment "not yet open"
state (review cycle hasn't started), goal progress indicators.

## Phase 6 — Expenses + Notifications + Settings

**Scope**: `ExpensePage` mobile-first claim list + receipt-capture bottom
sheet. `NotificationsPage` as a simple feed (read/unread, swipe-to-dismiss
pattern). `SettingsPage` covering dark mode (already wired via
`authStore.darkMode`), notification preferences, password change. Mock
data: `expense-claims.json`, `expense-categories.json`, `receipts` (n/a yet,
mock as file refs), `notifications.json`, `email-preferences.json`,
`announcements.json`, `messages.json`, `events.json`,
`company-policies.json`, `trainings.json`, `certifications.json`,
`colleagues.json`, `users.json`.

**UI states**: expense claim rejected-with-reason, notification empty
state, settings save-confirmation toast (already have `sonner` wired).

## Phase 7 — Integration Audit (FINAL — runs after all Backend phases)

**Scope**: `grep -rl "data/mock" src/pages src/components` and confirm zero
remaining imports — every page must be reading from the TanStack Query
hooks built in the Backend phases, not a leftover mock JSON import. Delete
`src/data/mock/` entirely once confirmed clean (keep nothing "just in case"
— if a domain still needs it, that's a sign a Backend phase was missed, not
a reason to keep the file). Confirm `authStore.ts` no longer stores a full
mock `EmployeeUser` object client-side — it should hold only UI state
(darkMode, mobileOpen) once Supabase Auth session is the source of truth for
identity (Backend Phase 1).

**To verify**: `npm run build` with the mock folder deleted must still
succeed — a successful build with `data/mock/` gone is the actual proof
this phase is complete, not just the grep coming back empty.
