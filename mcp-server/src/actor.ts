import { withPlainConnection } from './db.js'
import type { ActorClaims } from './db.js'
import { MCP_HRIS_ACTOR_EMAIL } from './config.js'

export interface ResolvedActor extends ActorClaims {
  email: string
}

// Looked up fresh from the DB on every call rather than cached anywhere —
// mirrors what the app's own lib/supabase.ts's fetchUserContext() does
// client-side, and avoids the exact bug this session already found and
// fixed in the app itself (see [[project_admin_dashboard_live_qa_2026_08]]):
// a null/failed role fetch must never be silently treated as "act with no
// permissions" or, worse here, "act with default permissions" — it must
// throw, so a broken lookup never masquerades as a legitimate low-privilege
// actor.
//
// Uses a raw pg query (not the service-role supabase-js client) because it
// needs `auth.users` for the email->user_id lookup, which PostgREST doesn't
// expose by default — a direct Postgres connection has no such restriction.
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
// — this resolves that from either an explicit per-call override or the
// configured default, so it's written once here instead of duplicated per
// tools/*.ts file (originally lived only in tools/teamAccess.ts; extracted
// when leave.ts needed the identical logic for approve/reject_leave_request).
export async function resolveEffectiveActor(actorEmailOverride: string | undefined): Promise<ResolvedActor> {
  const email = actorEmailOverride ?? MCP_HRIS_ACTOR_EMAIL
  if (!email) {
    throw new Error(
      'No actor email available — set MCP_HRIS_ACTOR_EMAIL in .env.local, or pass actor_email explicitly for this call.',
    )
  }
  return resolveActor(email)
}
