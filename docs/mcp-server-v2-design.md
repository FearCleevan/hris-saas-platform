# HRISPH MCP Server v2 — Remote claude.ai Connector — Design Plan

Status: **plan only, not started.** Written after v1 (local stdio server,
`hris-saas-platform/mcp-server/`) was fully built, unit-tested (130 tests),
and confirmed working from a real Claude Code session. User asked how to
get the same "Connectors" entry in claude.ai's own settings that
`crm-project` has, and this is the plan for that — a genuinely separate,
much larger build than v1, not a config toggle.

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

**Open technical question, not yet answered — needs a spike before
committing to full v2 implementation**: does the `pg` npm package work
correctly inside a Supabase Edge Function's Deno runtime via an `npm:`
specifier, including holding one connection across multiple sequential
statements? Supabase Edge Functions increasingly support `npm:` imports,
but connection-pooling behavior, cold-start connection limits, and whether
`pg.Pool`/`PoolClient.query()` sequencing behaves identically under Deno's
runtime are unverified. If `pg` doesn't work cleanly there, options include:

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
   Function. This gates everything else — don't proceed past this until
   it's answered one way or the other.
2. **Refactor v1 for shared tool definitions** (§3) — no new capability,
   pure restructuring, full v1 test suite must still pass unchanged
   afterward (proves the refactor didn't change behavior).
3. **OAuth + JSON-RPC scaffold**: `hris-mcp` Edge Function with `index.ts`/
   `auth.ts`/`oauth.ts` (adapted from CRM's), zero tools wired in yet —
   verify claude.ai will actually accept it as a Custom Connector before
   porting any real tool logic.
4. **Wire in the shared tool definitions** from Phase 2, using whichever
   Postgres approach Phase 1's spike settled on.
5. **Manual verification**: register as a real Custom Connector in
   claude.ai, exercise a read tool and a guarded write tool for real,
   confirm the token-rotation story (Supabase Dashboard → Edge Functions →
   Secrets, matching CRM's documented flow) actually works.

## 7. Non-goals

- No connector-URL settings panel in the admin dashboard (§4) — deferred.
- No per-user/per-org distinct tokens or a real OAuth consent flow — matches
  CRM's own scope exactly; this is a personal connector, not a
  customer-facing product feature.
- No new tools beyond what v1 already has — v2 is a transport/hosting
  change, not a scope expansion.
