# HRISPH MCP Server v2 — Remote claude.ai Connector — Design Plan

Status: **Phases 1-4 all DONE. Connector registers, authorizes, and calls
real tools successfully from claude.ai's actual production infrastructure
(not just local curl tests) — confirmed live 2026-08-29, screenshot of
"HRIS ... Custom ... ✓" in claude.ai's Connectors settings. Phase 5 (final
polish/token-rotation doc) not started, but the connector is functionally
complete and usable today.** Written
after v1 (local stdio server,
`hris-saas-platform/mcp-server/`) was fully built, unit-tested (130 tests),
and confirmed working from a real Claude Code session. User asked how to
get the same "Connectors" entry in claude.ai's own settings that
`crm-project` has, and this is the plan for that — a genuinely separate,
much larger build than v1, not a config toggle.

**Spike result (2026-08-28)**: deployed a throwaway `pg-spike` Edge
Function to the real `hrisph` project and confirmed `pg` (via
`npm:pg@8.13.1`) correctly holds one connection across
`BEGIN`/`set_config()`/`SELECT`/`COMMIT` — the exact multi-statement
transaction pattern `db.ts`'s `withActorClaims` needs — using
`Deno.env.get('SUPABASE_DB_URL')`, which is **auto-provided to every Edge
Function by default, no secret needs setting**. Confirmed via a real HTTP
call: `set_config('request.jwt.claims', ...)` written inside the
transaction was correctly read back by a subsequent query in the same
transaction, then committed. This resolves §2's open question — the `pg`
approach can be ported directly, no fallback to a different driver or the
dispatcher-RPC alternative needed. (Worth noting: Supabase's own official
docs example for direct-Postgres-from-Edge-Functions uses `postgres`/
postgres.js instead of `pg` — that may still be worth trying if `pg` ever
shows problems at higher concurrency/cold-start scale, but wasn't needed
for this spike.)

---

## 1. What CRM's v2 actually is (corrected understanding)

Read the real implementation this time (`crm-project/crm-app/supabase/
functions/crm-mcp/`), not just its design spec. The important correction
from what I assumed earlier in this conversation: **it is not real
per-user OAuth.** `auth.ts`'s entire check is:

```ts
export async function checkAuth(req: Request): Promise<boolean> {
  const expected = Deno.env.get('CRM_MCP_TOKEN')
  const received = req.headers.get('Authorization')
  return timingSafeEqual(received, `Bearer ${expected}`)
}
```

One static shared secret, set as an Edge Function secret, checked on every
tool call. The `/authorize`, `/token`, `/register`,
`/.well-known/oauth-authorization-server` endpoints (`oauth.ts`, not yet
read line-by-line but referenced throughout `index.ts`) exist purely
because **claude.ai's Custom Connector UI requires something that speaks
OAuth 2.1** before it will let a user add a connector at all — the actual
"authorization" a user goes through is just pasting in that one shared
token. This is the same trust model as v1 (one trusted operator, one
secret) — just reachable over HTTPS instead of only from `claude mcp add`
on one machine.

`index.ts` implements raw JSON-RPC 2.0 over a single `Deno.serve()` HTTP
handler — `initialize`, `tools/list`, `tools/call` — not the
`@modelcontextprotocol/sdk`'s `McpServer` class at all (that's a stdio/SDK
convenience wrapper; the Edge Function speaks the wire protocol directly).
Tools are a flat array of `{ name, description, schema, handler }`
(`tools/registry.ts`), matched by name in the `tools/call` switch case.

**This resolves the multi-tenancy question I raised before I'd read the
real code.** There's no per-user identity distinction to design here — v1
already solved "which org" by taking `org_id` as an explicit parameter on
every tool call (not implicitly scoped). A single-shared-token connector
for HRISPH works exactly the same way: one trusted caller (you, from
claude.ai), reaching every org exactly like v1 already does, with
`org_id`/`actor_email` passed per call. No new authorization model needs
inventing.

---

## 2. The real new problem: porting v1's Postgres logic to Deno

CRM's v1→v2 port was low-risk because CRM's tools are almost entirely
plain `supabase-js` table CRUD — trivially portable to Deno since
`@supabase/supabase-js` runs fine there. **HRISPH's v1 is not that simple.**
The entire `SET LOCAL request.jwt.claims` + RPC-in-one-transaction pattern
(`db.ts`'s `withActorClaims`) depends on a **raw `pg` connection with
multi-statement transaction control** (`BEGIN` / `set_config()` / the RPC
call / `COMMIT`, all on one held connection) — this is what most of v1's
write tools (team-access, leave approvals, offboarding completion) actually
need, and it's not something `supabase-js` can do at all (see v1's own
design doc, section 3.1, for why).

**RESOLVED (2026-08-28) — `pg` works.** Deployed a real throwaway Edge
Function (`pg-spike`) to confirm: `npm:pg@8.13.1` correctly holds one
connection across `BEGIN`/`set_config()`/`SELECT`/`COMMIT`, using the
auto-provided `Deno.env.get('SUPABASE_DB_URL')` — no secret to configure.
A value set via `set_config` inside the transaction was correctly read
back by a later query in the same transaction, then committed. The
concerns below (connection pooling, cold starts) weren't stress-tested at
scale, but the core mechanism v1 depends on works. If `pg` ever does show
problems at higher concurrency, options include:

- Deno's native `postgres` module (a different driver, would need the
  `withActorClaims` logic re-verified against its API, not a drop-in swap).
- Falling back to the dispatcher-RPC approach v1's own design doc
  considered and rejected for Node (a `SECURITY DEFINER` Postgres function
  that does the `set_config()` + dispatch internally, callable via plain
  `supabase-js.rpc()` — no raw connection needed at all). This was rejected
  for v1 because it needed backend changes v1 could avoid; for v2, if `pg`
  turns out not to work well in Deno, this stops being avoidable and
  becomes the pragmatic choice.

**Recommendation: spike this first**, before writing any tool-porting code
— deploy a minimal Edge Function that does nothing but attempt
`BEGIN; SELECT set_config(...); SELECT 1; COMMIT;` over a raw `pg`
connection, and see if it actually works under real Supabase Edge Function
constraints (cold starts, connection limits, `npm:` import resolution).

---

## 2.5. The real registration blocker: RFC 8414 well-known-URI placement (found + fixed 2026-08-29)

After Phase 3's scaffold was deployed and passed every direct curl check,
claude.ai's own "Add custom connector" UI still failed with **"Couldn't
register with HRIS's sign-in service"**. Root cause, confirmed by finally
reading CRM's own `crm-mcp/README.md` and `crm-app/middleware.ts` instead of
just its `oauth.ts`: RFC 8414/9728's well-known-URI discovery algorithm
inserts the `.well-known/...` segment **between host and path** for any
issuer/resource URL that has a path component. HRISPH's issuer was the raw
Supabase Functions URL (`https://<ref>.supabase.co/functions/v1/hris-mcp`),
which has a path component — so claude.ai's client requested
`.well-known/oauth-authorization-server` inserted before `/functions/v1/
hris-mcp`, a URL Supabase's platform router never forwards to any function
at all. The request 404'd before `hris-mcp`'s own code ever ran, which is
exactly what CRM's README documents having already hit and fixed the same
way.

**Fix, mirroring CRM's exactly**: a Vercel Edge Middleware
(`apps/hris-admin-dashboard/middleware.ts` + `authorize-form.ts`) fronts
`hris-mcp` at the dashboard's own bare-root domain
(`https://adminhrisph.vercel.app`), proxying `/register`, `/authorize`,
`/token`, both `.well-known` paths, and non-GET `/` through to the real
Supabase function (`SUPABASE_HRIS_MCP_URL` env var on the Vercel project).
The Supabase function's `MCP_PUBLIC_URL` secret was set to
`https://adminhrisph.vercel.app` so `oauth.ts`'s metadata URLs advertise the
proxy domain, not the raw Supabase path. One difference from CRM's own
`middleware.ts`: `hris-admin-dashboard` is a Vite SPA (no Next.js), but
Vercel's Edge Middleware (`@vercel/functions`'s `next()` helper, not
`next/server`) is framework-agnostic — same file works unchanged.

**Register the connector in claude.ai using `https://adminhrisph.vercel.app`
— never the raw Supabase Functions URL.** Confirmed live: `.well-known`
metadata, `POST /register`, and the full OAuth handshake all work end to
end through the proxy, and claude.ai's Connectors settings shows HRIS as
connected with a working checkmark.

---

## 3. Avoiding CRM's duplication — a shared tool-definition layer

CRM's v1 (`mcp-server/tools/*.ts`) and v2 (`supabase/functions/crm-mcp/
tools/*.ts`) are **entirely separate, hand-duplicated files** — its own
design spec confirms this explicitly ("No shared code module between v1
and v2"). Acceptable for CRM's simpler tools; a real maintenance risk for
HRISPH given v1's tools already run to ~20 functions across 8 files with
real business-logic guards (the last-super-admin check, the
never-auto-complete-offboarding safety divergence, etc.) — duplicating all
of that by hand into a second codebase is exactly the kind of place a
subtle divergence (v1 has the guard, the hand-copied v2 version doesn't)
could quietly reintroduce a bug v1 already fixed.

**Proposed improvement over CRM's approach**: restructure v1's
`registerXTools(server)` functions so each tool is first defined as a
plain, transport-agnostic object —

```ts
export const deactivateMemberTool = {
  name: 'deactivate_member',
  description: '...',
  schema: { org_id: z.string().uuid(), user_id: z.string().uuid(), confirm: z.boolean().default(false), ... },
  handler: safeTool(async ({ org_id, user_id, confirm, actor_email }) => { /* same body as today */ }),
}
```

— then `registerTeamAccessTools(server)` becomes a thin loop calling
`server.tool(t.name, t.description, t.schema, t.handler)` for each. A v2
Edge Function then imports the **same tool objects** and feeds them into
its own `TOOLS` array (matching CRM's `registry.ts` shape) instead of
duplicating handler bodies. This works as long as the handler bodies'
actual dependencies (`supabaseClient.ts`, `orgGuard.ts`, `actor.ts`,
`db.ts`) either run unchanged under Deno (true for anything using only
`@supabase/supabase-js` and `zod`) or get a Deno-specific implementation
swapped in behind the same function signature (true for `db.ts` if the
`pg`-in-Deno spike above fails and a different driver is needed there).
This is a refactor of existing v1 code, not new functionality — worth
doing early in v2's build, before tool-by-tool porting starts, so it isn't
done twice.

**Correction (Phase 4, 2026-08-29): this section's hope of literally
sharing the same files across v1 and v2 didn't pan out** — Deno can't
resolve v1's Node-style bare specifiers (`zod`, `pg`,
`@supabase/supabase-js`) or `process.env`, and the `deploy_edge_function`
tool needs an explicit file list for the one function being deployed, not
an arbitrary cross-monorepo relative import. What Phase 2's `ToolDef`
refactor still bought was a **template to port from**, not code to import:
`backend/supabase/functions/hris-mcp/lib/*.ts` and `tools/*.ts` are
Deno-native ports of v1's `src/*.ts` and `src/tools/*.ts` — same shapes,
same business logic, same safety guards, `npm:`-prefixed imports and
`Deno.env.get()` instead of bare specifiers and `process.env`. This is
exactly the CRM precedent this section set out to avoid (CRM's own
`crm-mcp/tools/` is a separate, hand-ported copy of its v1 tools) — turns
out that's not avoidable across a Node/Deno boundary without a shared build
step, which wasn't worth introducing for one function. The risk this
section worried about (a guard existing in v1 but missing from the v2 copy)
is mitigated instead by porting file-for-file and line-for-line rather than
by re-deriving each tool from scratch.

---

## 4. Where the connector URL gets surfaced

CRM shows its connector URL + token-rotation instructions in
Settings → API Integration (a real panel in the CRM app itself). HRISPH's
admin dashboard has no equivalent panel. Two options:

- **Skip it for now** — since this is single-operator use (you, via your
  own claude.ai account), the URL and token can just live in a note/your
  password manager, no UI needed. Matches the actual stated need
  ("so I can put in the Connectors in Claude ai") rather than building a
  UI feature nobody but you will use yet.
- **Build the panel later** if HRISPH ever needs this to be something
  other admins self-serve — not now.

**Recommendation: skip the UI panel for v2's initial build.** Revisit only
if the need changes from "my own personal connector" to "a feature other
HRISPH admins configure themselves."

---

## 5. Proposed architecture summary

- New Edge Function `hris-mcp` (mirrors `crm-mcp`'s file layout almost
  directly): `index.ts` (JSON-RPC dispatch), `auth.ts` (single static
  token check, near-identical to CRM's), `oauth.ts` (the `/authorize`,
  `/token`, `/register`, `.well-known` endpoints — likely portable
  close-to-verbatim from CRM's, since none of that logic is CRM-specific).
- `HRIS_MCP_TOKEN` as a new Edge Function secret (mirrors `CRM_MCP_TOKEN`).
- Tool definitions imported from a shared, transport-agnostic layer (§3)
  rather than duplicated — the actual new work is the refactor to extract
  that layer, plus whatever `db.ts` ends up needing for Deno (§2).
- Every existing v1 safety property carries over unchanged: `confirm: true`
  guards, the `change_user_role` last-super-admin check, the
  never-auto-complete-offboarding divergence, `assertOrgUsable`'s
  allowlist/existence check. None of this is v1-specific — it lives in the
  shared handler bodies.
- No connector-URL UI panel (§4) — deferred.

## 6. Suggested build phases

1. **Spike**: confirm `pg` (or an alternative) actually works for
   multi-statement transactions inside a real deployed Supabase Edge
   Function. **Status: DONE (2026-08-28) — `pg` works, see §2.**
2. **Refactor v1 for shared tool definitions** (§3) — no new capability,
   pure restructuring, full v1 test suite must still pass unchanged
   afterward (proves the refactor didn't change behavior). **Status: DONE
   (2026-08-28)** — every tool in all 8 `tools/*.ts` files now exported as
   a `ToolDef` object (`src/tools/types.ts`); `registerXTools(server)` is a
   one-line loop (`registerTools(server, xTools)`) instead of inline
   `server.tool()` calls. All 130 unit tests pass unchanged, `npm run
   verify` still pulls real live data — confirms zero behavior change.
   `index.ts` needed no changes at all (same `registerXTools(server)`
   call signature). A v2 dispatcher can now `import { teamAccessTools }
   from './tools/teamAccess.js'` etc. and feed the flat arrays into its own
   JSON-RPC `tools/call` switch, matching CRM's `tools/registry.ts` shape,
   without duplicating any handler body.
3. **OAuth + JSON-RPC scaffold**: `hris-mcp` Edge Function with `index.ts`/
   `auth.ts`/`oauth.ts` (adapted from CRM's), zero tools wired in yet —
   verify claude.ai will actually accept it as a Custom Connector before
   porting any real tool logic. **Status: scaffold deployed and
   structurally verified (2026-08-29)**, deployed at
   `backend/supabase/functions/hris-mcp/` (project `ztpoqosyrcepvwwwnsar`),
   `verify_jwt: false` (must accept unauthenticated OAuth-discovery
   requests — claude.ai hits `.well-known/*`/`/authorize` with no Supabase
   JWT at all). One deliberate simplification over CRM's version: CRM's
   failed-token retry path assumes a separate Vercel proxy in front of the
   function (documented in CRM's own code as fragile); HRISPH has no such
   proxy, so a failed attempt here just re-renders the form with an error
   instead of a redirect. Verified live via `scripts/verify-phase3-v2-live.mjs`:
   both `.well-known` endpoints return correct metadata, an unauthenticated
   `tools/list` call returns `401` with the correct `WWW-Authenticate`
   header, the `/authorize` form renders correctly for valid params, and is
   rejected for a disallowed `redirect_uri`. **Status: fully done
   (2026-08-29)** — the real end-to-end OAuth handshake was blocked by the
   RFC 8414 well-known-URI bug (§2.5), fixed via a Vercel Edge Middleware
   proxy at `https://adminhrisph.vercel.app`. Registering the connector in
   claude.ai now succeeds; Connectors settings shows HRIS connected.
4. **Wire in the ported tool definitions** (§3's correction) — all 33 tools
   across all 8 categories (actor, orgs, team access, employees, schedule,
   leave, offboarding, payroll). **Status: DONE (2026-08-29)** — deployed to
   `hris-mcp` (Supabase project `ztpoqosyrcepvwwwnsar`, deployment version
   4). Live-verified through the Vercel proxy against real data (org "The
   Launchpad Inc"): `simulate_actor` (exercises the ported `pg`/`db.ts`
   connection), `get_org_context` (plain `supabase-js` read), `list_team_
   members` (the `withActorClaims` RPC-in-transaction path, returned the
   real 3-member roster), and `bulk_terminate_employees` called without
   `confirm` (correctly refused with the guard message, no data touched —
   proves the safety-guard logic ported correctly without needing to
   actually terminate a real employee to prove it).
5. **Manual verification / polish** (not started): confirm the
   token-rotation story (Supabase Dashboard → Edge Functions → Secrets +
   Vercel env var, matching CRM's documented flow) actually works end to
   end, and exercise a few more of the 33 tools for real from within a
   claude.ai conversation (not just curl) to confirm claude.ai's own client
   calls them correctly.

## 7. Non-goals

- No connector-URL settings panel in the admin dashboard (§4) — deferred.
- No per-user/per-org distinct tokens or a real OAuth consent flow — matches
  CRM's own scope exactly; this is a personal connector, not a
  customer-facing product feature.
- No new tools beyond what v1 already has — v2 is a transport/hosting
  change, not a scope expansion.
