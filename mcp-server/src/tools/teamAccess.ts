import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { resolveEffectiveActor } from '../actor.js'
import { withActorClaims } from '../db.js'
import { assertOrgUsable } from '../orgGuard.js'
import { safeTool, jsonResult, errorResult } from '../toolResult.js'

const ROLE_SLUGS = ['super_admin', 'hr_manager', 'hr_staff', 'accountant'] as const

// get_team_members / get_pending_invites are SECURITY DEFINER RPCs that
// check the *caller* is a member of the org being queried (`chk.user_id =
// auth.uid() AND chk.organization_id = p_organization_id` — see
// docs/mcp-server-design.md section 3.1's note on this). That means the
// configured MCP_HRIS_ACTOR_EMAIL can only successfully query orgs it's
// actually a member of, even though this server otherwise allows touching
// every org (section 3.3) — that part of the "every org reachable" promise
// depends on which real user you act as, not on this server's own org
// guard. Every tool here accepts an optional actor_email override for
// exactly this reason: to query an org the default actor doesn't belong to,
// pass a real member of that org instead. resolveEffectiveActor() itself
// lives in ../actor.ts, shared with leave.ts's approve/reject tools.

// change_user_role's DB RPC has NO guard against demoting the last active
// super_admin in an org — unlike deactivate_member, which refuses that case
// itself (confirmed live via SQL during the prior QA session). This
// reproduces that same check at the MCP layer so this tool can't silently
// lock an org out of super_admin access the way the raw RPC would allow.
// Reuses get_team_members (already fetched inside the same claims-scoped
// transaction) rather than a second query.
function wouldStripLastSuperAdmin(
  members: { user_id: string; role_slug: string; is_active: boolean }[],
  targetUserId: string,
  newRoleSlug: string,
): boolean {
  if (newRoleSlug === 'super_admin') return false // not a demotion away from super_admin
  const target = members.find((m) => m.user_id === targetUserId)
  if (!target || target.role_slug !== 'super_admin') return false // wasn't super_admin to begin with
  const otherActiveSuperAdmins = members.filter(
    (m) => m.user_id !== targetUserId && m.role_slug === 'super_admin' && m.is_active,
  )
  return otherActiveSuperAdmins.length === 0
}

export function registerTeamAccessTools(server: McpServer) {
  server.tool(
    'list_team_members',
    'List all team members (active and inactive) for an organization, via the org-scoped get_team_members RPC. ' +
      'Requires the acting user to be a member of that org — see this file\'s header comment.',
    { org_id: z.string().uuid(), actor_email: z.string().email().optional() },
    safeTool(async ({ org_id, actor_email }) => {
      await assertOrgUsable(org_id)
      const actor = await resolveEffectiveActor(actor_email)

      return withActorClaims(actor, async (query) => {
        const { rows } = await query('SELECT * FROM get_team_members($1)', [org_id])
        return jsonResult(rows)
      })
    }),
  )

  server.tool(
    'list_pending_invites',
    'List pending invitations for an organization, via the org-scoped get_pending_invites RPC. Requires the ' +
      'acting user to be a member of that org.',
    { org_id: z.string().uuid(), actor_email: z.string().email().optional() },
    safeTool(async ({ org_id, actor_email }) => {
      await assertOrgUsable(org_id)
      const actor = await resolveEffectiveActor(actor_email)

      return withActorClaims(actor, async (query) => {
        const { rows } = await query('SELECT * FROM get_pending_invites($1)', [org_id])
        return jsonResult(rows)
      })
    }),
  )

  server.tool(
    'get_team_member',
    'Get one team member from an org\'s roster by user_id (filters list_team_members\' result — there is no ' +
      'single-row RPC for this).',
    { org_id: z.string().uuid(), user_id: z.string().uuid(), actor_email: z.string().email().optional() },
    safeTool(async ({ org_id, user_id, actor_email }) => {
      await assertOrgUsable(org_id)
      const actor = await resolveEffectiveActor(actor_email)

      return withActorClaims(actor, async (query) => {
        const { rows } = await query('SELECT * FROM get_team_members($1)', [org_id])
        const member = rows.find((r: any) => r.user_id === user_id)
        if (!member) return errorResult(`No team member with user_id ${user_id} found in org ${org_id}.`)
        return jsonResult(member)
      })
    }),
  )

  server.tool(
    'deactivate_member',
    'Deactivate a team member, immediately revoking their access to HRISPH. Requires confirm: true. The underlying ' +
      'deactivate_member RPC itself refuses if the target is the last active super_admin in the org.',
    {
      org_id: z.string().uuid(),
      user_id: z.string().uuid(),
      confirm: z.boolean().default(false),
      actor_email: z.string().email().optional(),
    },
    safeTool(async ({ org_id, user_id, confirm, actor_email }) => {
      await assertOrgUsable(org_id)
      if (!confirm) {
        return errorResult(
          `Deactivating user ${user_id} in org ${org_id} will immediately revoke their access to HRISPH. ` +
            `Re-call with confirm: true to proceed.`,
        )
      }
      const actor = await resolveEffectiveActor(actor_email)

      return withActorClaims(actor, async (query) => {
        await query('SELECT deactivate_member($1)', [user_id])
        return jsonResult({ org_id, user_id, deactivated: true })
      })
    }),
  )

  server.tool(
    'reactivate_member',
    'Reactivate a previously deactivated team member, restoring their access to HRISPH. Not guarded — restoring ' +
      'access is treated as low-risk, matching the app\'s own UI (no confirm dialog on Reactivate, only Deactivate).',
    { org_id: z.string().uuid(), user_id: z.string().uuid(), actor_email: z.string().email().optional() },
    safeTool(async ({ org_id, user_id, actor_email }) => {
      await assertOrgUsable(org_id)
      const actor = await resolveEffectiveActor(actor_email)

      return withActorClaims(actor, async (query) => {
        await query('SELECT reactivate_member($1)', [user_id])
        return jsonResult({ org_id, user_id, reactivated: true })
      })
    }),
  )

  server.tool(
    'change_user_role',
    'Change a team member\'s role within an org. Requires confirm: true. Unlike deactivate_member, the underlying ' +
      'change_user_role RPC has NO guard against demoting the last active super_admin — this tool adds that check ' +
      'itself and refuses outright (no confirm override) if the change would strip an org of its last super_admin.',
    {
      org_id: z.string().uuid(),
      user_id: z.string().uuid(),
      new_role_slug: z.enum(ROLE_SLUGS),
      confirm: z.boolean().default(false),
      actor_email: z.string().email().optional(),
    },
    safeTool(async ({ org_id, user_id, new_role_slug, confirm, actor_email }) => {
      await assertOrgUsable(org_id)
      const actor = await resolveEffectiveActor(actor_email)

      return withActorClaims(actor, async (query) => {
        const { rows: members } = await query('SELECT * FROM get_team_members($1)', [org_id])

        if (wouldStripLastSuperAdmin(members, user_id, new_role_slug)) {
          return errorResult(
            `Refusing: changing user ${user_id}'s role to "${new_role_slug}" would leave org ${org_id} with no ` +
              `active super_admin. This isn't guarded by confirm — pick a different target or promote another ` +
              `super_admin first.`,
          )
        }

        if (!confirm) {
          return errorResult(
            `Changing user ${user_id}'s role to "${new_role_slug}" in org ${org_id}. Re-call with confirm: true to proceed.`,
          )
        }

        await query('SELECT change_user_role($1, $2)', [user_id, new_role_slug])
        return jsonResult({ org_id, user_id, new_role_slug, changed: true })
      })
    }),
  )

  server.tool(
    'revoke_invite',
    'Revoke a pending invitation so it can no longer be accepted. Requires confirm: true.',
    {
      org_id: z.string().uuid(),
      invite_id: z.string().uuid(),
      confirm: z.boolean().default(false),
      actor_email: z.string().email().optional(),
    },
    safeTool(async ({ org_id, invite_id, confirm, actor_email }) => {
      await assertOrgUsable(org_id)
      if (!confirm) {
        return errorResult(
          `Revoking invite ${invite_id} will prevent it from ever being accepted. Re-call with confirm: true to proceed.`,
        )
      }
      const actor = await resolveEffectiveActor(actor_email)

      return withActorClaims(actor, async (query) => {
        await query('SELECT revoke_invite($1)', [invite_id])
        return jsonResult({ org_id, invite_id, revoked: true })
      })
    }),
  )
}
