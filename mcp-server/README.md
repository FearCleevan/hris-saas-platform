# HRISPH MCP Server (local dev connector)

A local, stdio-based MCP server exposing HRISPH's core data (team & access,
employees, schedules, leave, offboarding, payroll) as tools for Claude Code.
Local-only — meant to be run by one developer on their own machine.

See `../docs/mcp-server-design.md` for the full design, including why this
can't just copy the `crm-project/crm-app/mcp-server` pattern wholesale (most
HRISPH mutations go through `SECURITY DEFINER` RPCs that check the caller's
JWT claims — a plain service-role client can't satisfy those the way it can
for CRM's simpler direct-table-write model).

**Phase 1 (current)**: read-only tools across every domain, plus
`simulate_actor`. Write tools (deactivate/reactivate/role-change, schedule
assignment, leave approval, etc.) are Phase 2+ — see the design doc's phase
breakdown.

## Setup

1. `cd hris-saas-platform/mcp-server && npm install`
2. `cp .env.local.example .env.local` and fill in:
   - `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` — Supabase Dashboard →
     Project Settings → API.
   - `HRIS_DB_URL` — Supabase Dashboard → Project Settings → Database →
     Connection string → **Session pooler** (port 5432). Do not use the
     Transaction pooler (6543) — see the comment in `.env.local.example` and
     `src/db.ts` for why.
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

## Manual verification

`npm run verify` — runs `scripts/verify-handshake.mjs`: spins up the real
server over stdio, lists tools, and calls a few read-only ones. Expects
structured `isError: true` results (not a crashed process) if `.env.local`
isn't filled in with real credentials yet.

`npx @modelcontextprotocol/inspector node dist/index.js` — opens a local
browser UI to call any tool directly.
