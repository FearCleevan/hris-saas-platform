import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { resolveActor } from '../actor.js'
import { withActorClaims } from '../db.js'
import { assertOrgUsable } from '../orgGuard.js'
import { MCP_HRIS_ACTOR_EMAIL } from '../config.js'
import { safeTool, jsonResult, errorResult } from '../toolResult.js'

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
// pass a real member of that org instead.
async function resolveEffectiveActor(actorEmailOverride: string | undefined) {
  const email = actorEmailOverride ?? MCP_HRIS_ACTOR_EMAIL
  if (!email) {
    throw new Error(
      'No actor email available — set MCP_HRIS_ACTOR_EMAIL in .env.local, or pass actor_email explicitly for this call.',
    )
  }
  return resolveActor(email)
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
}
