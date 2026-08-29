// Deno port of mcp-server/src/actor.ts.
import { withPlainConnection } from './db.ts'
import type { ActorClaims } from './db.ts'
import { MCP_HRIS_ACTOR_EMAIL } from './config.ts'

export interface ResolvedActor extends ActorClaims {
  email: string
}

// Looked up fresh from the DB on every call rather than cached anywhere —
// see mcp-server/src/actor.ts's header comment: a null/failed role fetch
// must never be silently treated as "no permissions" or "default
// permissions" — it must throw.
export async function resolveActor(email: string): Promise<ResolvedActor> {
  const normalized = email.trim().toLowerCase()

  const result = await withPlainConnection((query) =>
    query(
      `
      SELECT
        au.id::text                AS user_id,
        au.email                   AS email,
        up.organization_id::text   AS org_id,
        r.slug                     AS role_slug
      FROM auth.users au
      LEFT JOIN public.user_profiles up ON up.id = au.id
      LEFT JOIN public.user_roles ur
        ON ur.user_id = au.id AND ur.organization_id = up.organization_id
      LEFT JOIN public.roles r ON r.id = ur.role_id
      WHERE lower(au.email) = $1
      `,
      [normalized],
    ),
  )

  const row = result.rows[0] as
    | { user_id: string; email: string; org_id: string | null; role_slug: string | null }
    | undefined

  if (!row) {
    throw new Error(`No auth.users row found for email "${normalized}".`)
  }
  if (!row.org_id) {
    throw new Error(
      `"${normalized}" has no organization_id in user_profiles — this actor can't be used for org-scoped tools.`,
    )
  }
  if (!row.role_slug) {
    throw new Error(
      `"${normalized}" has an org (${row.org_id}) but no resolvable role in user_roles — refusing to guess a ` +
        `default role. Check user_roles/roles for this user and org before retrying.`,
    )
  }

  return {
    sub: row.user_id,
    email: row.email,
    org_id: row.org_id,
    user_role: row.role_slug,
  }
}

// Every org-scoped RPC-calling tool needs "which real user am I acting as"
// — resolved from either an explicit per-call override or the configured
// default.
export async function resolveEffectiveActor(actorEmailOverride: string | undefined): Promise<ResolvedActor> {
  const email = actorEmailOverride ?? MCP_HRIS_ACTOR_EMAIL
  if (!email) {
    throw new Error(
      'No actor email available — set MCP_HRIS_ACTOR_EMAIL as an Edge Function secret, or pass actor_email explicitly for this call.',
    )
  }
  return resolveActor(email)
}
