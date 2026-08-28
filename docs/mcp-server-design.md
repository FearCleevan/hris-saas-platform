# HRISPH MCP Server — Design Plan

Status: **Phase 1 complete and fully verified live** (`hris-saas-platform/mcp-server/`).
Built, connected against the real `hrisph` Supabase project, and registered
with Claude Code (`claude mcp add hris`) — confirmed `✔ Connected` via
`claude mcp list`. `npm run verify` exercises the full pipeline end-to-end:
resolves the real configured actor (`peter@peterpaullazan.com`) and pulls
real team-roster data through `list_team_members`'s `SET LOCAL
request.jwt.claims` + RPC path, over the actual MCP protocol. Phases 2-5
(writes) not started. Originally written after auditing the CRM project's
local MCP server (`crm-project/crm-app/mcp-server/`) at the user's request,
to work out what of that architecture transfers to HRISPH and what has to
change.

**Real-world connection gotcha worth remembering**: the "Direct connection"
string didn't work at all here (IPv6-only on Free tier, doesn't resolve on
this network). The Session pooler connection worked, but its host's node
number (`aws-1-ap-northeast-1`, not the commonly-documented `aws-0-`) isn't
derivable from the project's region — had to be found by trial. See
`.env.local.example` for the full note.

---

## 1. What the CRM project actually has

Two generations exist there:

- **v1 (`crm-app/mcp-server/`)** — a standalone Node/TypeScript package, stdio
  transport, registered locally via `claude mcp add crm -- node
  crm-app/mcp-server/dist/index.js`. One `registerXTools(server)` module per
  entity domain (`prospects.ts`, `deals.ts`, `campaigns.ts`, `notes.ts`,
  `workflows.ts`, `reports.ts`), each using `server.tool(name, description,
  zodShape, handler)`. This is the one worth copying from.
- **v2 (`supabase/functions/crm-mcp/`)** — the same tool set redeployed as a
  Supabase Edge Function speaking MCP's "Streamable HTTP" transport, with a
  hand-rolled OAuth 2.1 layer so CRM's own *end customers* can connect it to
  claude.ai as a product feature. This is solving a different problem
  (customer-facing product integration) — **not relevant here** and not part
  of this plan. Noted only so it doesn't get confused with v1.

### v1's actual design, in brief

- Own `package.json`/`tsconfig.json`, isolated from the Vite app — the
  service-role key must never be loadable by the frontend build.
- DB access via plain `@supabase/supabase-js` with the **service_role key**,
  which bypasses RLS entirely. Every tool is a direct `.from(table).select()
  / .insert() / .update()` call; only one tool (`get_report`) calls `.rpc()`,
  and those RPCs are read-only aggregates with no auth-context dependency.
- Write attribution (`created_by`, `user_id`) comes from one static env var,
  `MCP_CRM_USER_ID` — not real auth, just "which row to stamp."
- Exactly one safety guardrail, and it's a good pattern:
  `activate_campaign(id, confirm: boolean)` — without `confirm: true` it
  returns a structured error describing the real-world consequence ("will
  start sending real emails to N pending recipients") instead of silently
  acting. Checked in the tool handler, not the database.
- Verified with a custom `scripts/verify-handshake.mjs` (spins up the real
  server, lists tools, calls each one, specifically re-checks that
  `activate_campaign` without `confirm: true` neither errors-as-crash nor
  silently succeeds) plus the MCP Inspector for ad hoc calls.

This works for CRM because CRM's data model is single-tenant enough that
"bypass RLS with a service key" carries little blast radius, and none of its
write paths encode business rules beyond simple field updates.

---

## 2. Why that architecture can't just be copied here

Two structural differences between the projects break the "service-role key
+ direct table writes" model:

**a. HRISPH's mutations mostly live in `SECURITY DEFINER` RPCs that read the
Postgres session's JWT claims.** `deactivate_member`, `reactivate_member`,
`change_user_role`, `complete_offboarding`, `delete_employees_hard`,
`reject_leave_request`, `revoke_invite`, `setup_invited_user`, and others all
call `get_my_org_id()` / `get_my_role()` / `is_admin()` / `auth.uid()`
internally, which resolve from `current_setting('request.jwt.claims', true)`
— a session-scoped Postgres GUC. A plain `supabase-js` client using the
service-role key never sets that GUC, so every one of these RPCs would
immediately raise `'No organization context for current user'` if called the
way CRM's tools call `.rpc()`. This is exactly the problem this session's
manual QA work kept working around by hand: every RPC call this session used
`SET LOCAL request.jwt.claims = '{"sub":...,"org_id":...,"user_role":...}'`
issued in the *same* raw-SQL statement as the RPC call — something
`supabase-js`'s REST-based `.rpc()` cannot do, because PostgREST doesn't
expose "run this SQL block on one session," and there's no guarantee two
separate REST calls land on the same underlying Postgres connection anyway.

**b. HRISPH is genuinely multi-tenant, in the same Supabase project as other
real orgs' data.** This session alone touched three other real orgs by ID
while cross-checking things (`45fe5603-...`, `7e4abdce-...`, plus whatever
else exists). A service-role key here can read or write *any* org's data,
not just The Launchpad Inc's test org. CRM has no equivalent blast radius.

**c. Some RPCs encode business rules an MCP tool must not bypass.**
`deactivate_member` refuses to deactivate the last active super_admin in an
org; `reject_leave_request` reverses `pending_days` atomically;
`complete_offboarding` requires both clearance and final pay to be terminal
before it will act, then reuses `delete_employees_hard`. Going around these
RPCs with raw table writes (CRM's pattern) would mean re-implementing that
logic in the MCP tool — duplicated, and easy to get subtly wrong.

None of this makes the CRM design *wrong* — it's correctly scoped to CRM's
actual risk profile. It just doesn't transfer as-is.

---

## 3. What has to change for HRISPH

### 3.1 DB access: a real Postgres connection, not just `supabase-js`

The MCP server needs to reproduce the `SET LOCAL request.jwt.claims = ...;
SELECT <rpc>(...);` pattern used manually all session — both statements in
one transaction, on one connection. `supabase-js`'s REST client can't do
this. Two ways to get it:

- **Recommended: a direct Postgres connection** via the `pg` npm package,
  using Supabase's *session-mode* connection string (port 5432, not the
  6543 transaction-pooler port — transaction-mode pooling can hand different
  statements in the same logical call to different backend connections,
  which would break `SET LOCAL`). Every write-tool wraps its RPC call in
  `BEGIN; SET LOCAL request.jwt.claims = '...'; SELECT rpc(...); COMMIT;`
  — the same thing this session's `execute_sql` MCP tool has been doing
  under the hood all along. No backend/migration changes needed at all.
- **Alternative, if a direct DB connection string isn't available/desired**:
  add a small `SECURITY DEFINER` dispatcher RPC on the backend
  (`mcp_call_as(p_actor_user_id, p_function_name, p_args jsonb)`) that does
  the `set_config('request.jwt.claims', ..., true)` + dynamic call inside a
  single Postgres function body, callable over plain `supabase-js.rpc()`.
  Simpler for the Node side, but means touching the backend and needing a
  whitelist of callable function names to avoid turning this into an
  arbitrary-SQL-execution tool. **Recommend the direct-`pg`-connection
  approach unless there's a concrete reason the connection string can't be
  used** (e.g. IP allowlisting on the DB).

Plain reads (`list_team_members`, `list_employees`, `get_offboarding_detail`,
etc.) don't need any of this — they're fine as ordinary `supabase-js`
service-role `.select()` calls, exactly like CRM's read tools. Only calls
that go through an org-scoped `SECURITY DEFINER` RPC need the claims dance.

### 3.2 Acting as someone: `simulate_actor`, resolved dynamically

CRM's static `MCP_CRM_USER_ID` env var works because CRM doesn't need a
role/org to change out from under it. HRISPH's actor needs an `org_id` and
`user_role` too, and those can genuinely change (this session changed one
mid-test). Rather than hardcode all three in `.env.local` and risk them
drifting stale:

- One env var: `MCP_HRIS_ACTOR_EMAIL` (or user id).
- A `simulate_actor()` tool (also called internally by every write tool)
  that looks up that actor's current `user_id` / `org_id` / role fresh from
  `user_profiles`/`user_roles` on each call — mirroring exactly what the
  app's own `fetchUserContext()` does client-side. No stale cached claims.

### 3.3 Org validation — no fixed allowlist, per the user's decision

**Decided 2026-08-28**: the user wants every org in the platform reachable
(this is a whole-platform admin/dev tool, not scoped to one test tenant), so
there's no fixed `MCP_HRIS_ALLOWED_ORG_IDS` restricting *which* orgs can be
touched. Kept instead, as a lighter sanity guard: every tool that takes an
`org_id` (directly or via a resolved employee/user) validates it against a
live `organizations` lookup before acting, so a typo'd or garbage id fails
clearly rather than silently matching zero rows or (worse) some unintended
row. `MCP_HRIS_ALLOWED_ORG_IDS` stays available as an *optional* env var for
future tightening (e.g. restricting a specific machine/session to one org)
but is unset, and unenforced, by default.

### 3.4 Guardrails: keep CRM's `confirm: true` pattern, extend it

Directly reuse the pattern — it's good, and this session hit exactly the
scenario it's meant to prevent (the safety classifier blocked a
`complete_offboarding` call against a real employee record earlier today,
which a tool-level guard should catch before it ever reaches that layer).
Guarded tools:

- `deactivate_member` — plain-language warning of who's being deactivated.
- `change_user_role` — **this one needs an MCP-side check that the DB RPC
  itself doesn't have**: `change_user_role` has no "don't demote the last
  super_admin" guard the way `deactivate_member` does. The MCP tool should
  add that check itself (count remaining super_admins for the org, excluding
  the target, before allowing a demotion) rather than assume the RPC covers
  it — a case where the MCP layer needs to be *stricter* than a passthrough.
- `complete_offboarding` — terminates a real employee, no undo path.
- `bulk_terminate_employees` (wraps `delete_employees_hard`).
- `revoke_invite` — lower stakes, but consistent to guard.
- `seed_leave_types` (see below) — writes permanent org config, not
  disposable test data, same as today's manual F7 seeding.

### 3.5 Package location

Sibling to `apps/` and `backend/`, not nested inside the Vite app — same
isolation rationale as CRM: `hris-saas-platform/mcp-server/`.

---

## 4. Proposed tool inventory

Grouped by the same domains this session's manual QA already worked through
— that's not a coincidence, it's the actual evidence for where the value is.

| Domain | Tools | Notes |
|---|---|---|
| **actor** | `simulate_actor(email)` | Returns `{user_id, org_id, role}` for use in reasoning; also called internally by every guarded write. |
| **team-access** | `list_team_members(org_id?)`, `get_team_member(user_id)`, `deactivate_member(user_id, confirm)` 🔒, `reactivate_member(user_id)`, `change_user_role(user_id, new_role_slug, confirm)` 🔒, `list_pending_invites(org_id?)`, `revoke_invite(invite_id, confirm)` 🔒, `resend_invite(invite_id)` | Directly replaces this session's F5 manual SQL. |
| **employees** | `search_employees(query, active_only?)`, `get_employee(id)`, `bulk_terminate_employees(ids, confirm)` 🔒 | |
| **schedule** | `list_schedules(org_id?)`, `get_schedule_assignments(schedule_id?)`, `create_schedule(data)`, `update_schedule(id, data)`, `assign_employees_to_schedule(schedule_id, employee_ids)` | Reuses the exact "end current assignment on *any* schedule first" logic already in `services/attendance.ts` — read-only reads via service role, the assignment write needs the actor context since it's org-scoped by `employee_schedules.organization_id`. |
| **leave** | `list_leave_types(org_id?)`, `seed_default_leave_types(org_id, confirm)` 🔒, `apply_leave(data)`, `approve_leave_request(id)`, `reject_leave_request(id, remarks)`, `get_leave_balances(employee_id?)` | `seed_default_leave_types` formalizes what was done by hand this session for The Launchpad Inc. |
| **offboarding** | `list_offboarding_records()`, `get_offboarding_detail(id)`, `update_clearance_item(...)`, `update_final_pay_status(...)`, `complete_offboarding(id, confirm)` 🔒 | |
| **payroll** | `list_payroll_runs()`, `list_payroll_disputes(status?)`, `resolve_dispute(id, text)`, `reject_dispute(id, text)` | |
| **qa-utilities** | `get_org_context(org_id)` | Quick org/tenant lookup, mirrors what this session did ad hoc via SQL repeatedly. |

🔒 = requires `confirm: true`, returns a plain-language consequence message
without it, same as CRM's `activate_campaign`.

Dashboard/reports tools are deliberately **not** in scope yet — F10 confirmed
the dashboard is intentionally mock-only right now, so there's nothing real
to wrap.

---

## 5. Non-goals (mirroring CRM's v1, plus one addition)

- No remote/hosted server, no per-user OAuth (like CRM v1) — this is a local
  developer/QA tool, run by one person, same trust model as CRM's v1.
- No workflow-execution or automation triggers beyond what's listed above.
- No `crm_users`-equivalent admin/security-settings tools (org billing plan
  changes, auth provider config, etc.) — no product reason for an AI tool to
  touch these.
- **New for HRISPH**: no tool ever operates outside `MCP_HRIS_ALLOWED_ORG_IDS`
  — this is the one hard line CRM's design doesn't need and HRISPH's does.

---

## 6. Suggested build phases (if this gets a "yes, build it")

Per the usual phase-by-phase protocol — each phase ends in a working,
independently-testable server, not a partial one:

1. **Skeleton + reads**: package scaffold, `pg` connection setup,
   `simulate_actor`, org-allowlist guard, and every read-only tool
   (`list_team_members`, `list_employees`, `list_schedules`,
   `list_leave_types`, `list_offboarding_records`, `list_payroll_runs`,
   `list_payroll_disputes`). Proves the connection + allowlist pattern work
   before any write exists.
2. **Team-access writes** (directly replaces today's F5 manual work):
   `deactivate_member`, `reactivate_member`, `change_user_role` (with its
   extra last-super-admin guard), `revoke_invite`, `resend_invite`.
3. **Schedule + leave writes**: `create_schedule`, `update_schedule`,
   `assign_employees_to_schedule`, `apply_leave`,
   `approve_leave_request`/`reject_leave_request`, `seed_default_leave_types`.
4. **Offboarding + payroll writes**: `complete_offboarding`,
   `update_clearance_item`, `update_final_pay_status`,
   `resolve_dispute`/`reject_dispute`, `bulk_terminate_employees`.
5. **Verification script**: a `verify-handshake.mjs` equivalent — spin up
   the real server, list tools, call each guarded tool once *without*
   `confirm: true` and assert it refuses cleanly, matching CRM's own
   verification discipline for `activate_campaign`.

Each phase gets its own `npm run build` + a manual exercise against real
(or disposable test) data before moving to the next, consistent with the
existing phase-by-phase / build-must-pass protocol already in use on this
project.

---

## 7. Decisions (settled 2026-08-28)

- **DB access**: direct Postgres connection via `pg` (§3.1), not a new
  backend dispatcher RPC.
- **Org scope**: every org in the platform is reachable — no fixed
  allowlist, just a live-existence check per org id used (§3.3).
- **High-risk tools**: `complete_offboarding` / `bulk_terminate_employees`
  are deferred past Phase 3. Building Phases 1-3 first (all reads, then
  team-access writes, then schedule+leave writes) before revisiting whether
  Phase 4 is needed.

**Building now: Phase 1 (skeleton + read-only tools across every domain).**
