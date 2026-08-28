# HRISPH MCP Server (local dev connector)

A local, stdio-based MCP server exposing HRISPH's core data (team & access,
employees, schedules, leave, offboarding, payroll) as tools for Claude Code.
Local-only — meant to be run by one developer on their own machine.

See `../docs/mcp-server-design.md` for the full design, including why this
can't just copy the `crm-project/crm-app/mcp-server` pattern wholesale (most
HRISPH mutations go through `SECURITY DEFINER` RPCs that check the caller's
JWT claims — a plain service-role client can't satisfy those the way it can
for CRM's simpler direct-table-write model).

**Phase 1**: read-only tools across every domain, plus `simulate_actor`.
**Phase 2**: team-access writes — `deactivate_member`, `reactivate_member`,
`change_user_role`, `revoke_invite`. Three of the four require
`confirm: true`; `change_user_role` additionally refuses outright — even
with `confirm: true` — if the change would leave an org with no active
super_admin, a guard the underlying DB RPC itself doesn't have. Invite
*sending* (`resend_invite`/`send_invite`) is deferred — it requires calling
the `invite-member` Edge Function with a real signed user JWT, a different
auth mechanism than the `SET LOCAL request.jwt.claims` trick this server
otherwise uses for RPCs.
**Phase 3**: schedule + leave writes — `create_schedule`, `update_schedule`,
`assign_employees_to_schedule` (plain table writes, no RPC needed),
`apply_leave`, `approve_leave_request`/`reject_leave_request` (RPCs, use the
claims wrapper), `seed_default_leave_types` (the one guarded tool in this
phase).
**Phase 4 (current)**: offboarding + payroll writes — `update_clearance_item`,
`update_final_pay_status`, `complete_offboarding`, `bulk_terminate_employees`,
`resolve_dispute`/`reject_dispute`. `complete_offboarding` and
`bulk_terminate_employees` require `confirm: true` and actually terminate
employees — no tool-level undo. `update_clearance_item`/
`update_final_pay_status` deliberately do **not** auto-trigger
`complete_offboarding` the way the app's UI does (a documented safety
divergence — see the design doc §6 step 4's status note) — they keep the
`offboarding_records.clearance_status` rollup in sync, but completion always
needs a separate, explicitly confirmed call.

## Setup

1. `cd hris-saas-platform/mcp-server && npm install`
2. `cp .env.local.example .env.local` and fill in:
   - `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` — Supabase Dashboard →
     Project Settings → API.
   - `HRIS_DB_URL` — Supabase Dashboard → click **Connect** (top right) →
     copy a connection string. Prefer **Session pooler** (port 5432, IPv4);
     Direct connection is IPv6-only on the Free tier and may not resolve on
     your network. Do not use the Transaction pooler (6543) — see the
     comment in `.env.local.example` and `src/db.ts` for why. The pooler
     host's node number (`aws-N-<region>`) isn't derivable from the
     project's region — copy the exact string shown, don't guess it.
   - `MCP_HRIS_ACTOR_EMAIL` — a real HRISPH user's email with an active org
     + role. Used as the default identity for org-scoped RPC tools
     (`list_team_members`, `list_pending_invites`) when a call doesn't pass
     its own `actor_email`.
   - `MCP_HRIS_ALLOWED_ORG_IDS` — leave blank. Every org is reachable by
     default (2026-08-28 decision — see the design doc section 3.3).
3. `npm run build`
4. Register with Claude Code:
   `claude mcp add hris -- node hris-saas-platform/mcp-server/dist/index.js`

## A note on cross-org access

`list_team_members` / `list_pending_invites` call RPCs that check the
*caller* is a member of the org being queried. `MCP_HRIS_ACTOR_EMAIL` can
only successfully query orgs it actually belongs to — pass a different
`actor_email` per call to query an org the default actor isn't a member of.
Every other tool here (employees, schedule, leave, offboarding, payroll)
reads plain tables via the service-role key and isn't subject to this —
see `src/tools/teamAccess.ts`'s header comment for the full explanation.

## Testing

`npm test` — runs the full unit test suite (Vitest, mocked `pg`/`supabase-js`,
no network calls). Every function in every module has coverage; this is
part of each phase's definition of done, same as `npm run build` /
`npx tsc --noEmit`. `npm run test:watch` for interactive development.

## Manual verification

`npm run verify` — runs `scripts/verify-handshake.mjs`: spins up the real
server over stdio, lists tools, and calls a few read-only ones. Expects
structured `isError: true` results (not a crashed process) if `.env.local`
isn't filled in with real credentials yet.

`npx @modelcontextprotocol/inspector node dist/index.js` — opens a local
browser UI to call any tool directly.
