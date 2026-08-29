// Deno port of mcp-server/src/tools/orgs.ts.
import { z } from 'npm:zod@4'
import { supabase } from '../lib/supabaseClient.ts'
import { assertOrgUsable } from '../lib/orgGuard.ts'
import { safeTool, jsonResult } from '../lib/toolResult.ts'
import type { ToolDef } from './types.ts'

export const getOrgContextTool: ToolDef<{ org_id: string }> = {
  name: 'get_org_context',
  description:
    'Look up an organization by id — name, slug, plan, and basic counts. Quick sanity check before acting on an org_id.',
  schema: { org_id: z.string().uuid() },
  handler: safeTool(async ({ org_id }) => {
    const org = await assertOrgUsable(org_id)

    const [{ count: memberCount }, { count: employeeCount }] = await Promise.all([
      supabase.from('user_roles').select('*', { count: 'exact', head: true }).eq('organization_id', org_id),
      supabase.from('employees').select('*', { count: 'exact', head: true }).eq('organization_id', org_id).eq('is_active', true),
    ])

    return jsonResult({ ...org, memberCount: memberCount ?? 0, activeEmployeeCount: employeeCount ?? 0 })
  }),
}

export const orgTools: ToolDef[] = [getOrgContextTool]
