import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { supabase } from '../supabaseClient.js'
import { assertOrgUsable } from '../orgGuard.js'
import { safeTool, jsonResult, errorResult } from '../toolResult.js'

const OFFBOARDING_SELECT =
  'id, employee_id, separation_type, last_day_of_work, clearance_status, final_pay_status, final_pay_amount, final_pay_date, notes, created_at'

export function registerOffboardingTools(server: McpServer) {
  server.tool(
    'list_offboarding_records',
    'List offboarding records for an org.',
    { org_id: z.string().uuid() },
    safeTool(async ({ org_id }) => {
      await assertOrgUsable(org_id)
      const { data, error } = await supabase
        .from('offboarding_records')
        .select(OFFBOARDING_SELECT)
        .eq('organization_id', org_id)
        .order('created_at', { ascending: false })
      if (error) return errorResult(error.message)
      return jsonResult(data)
    }),
  )

  server.tool(
    'get_offboarding_detail',
    'Get one offboarding record by id, including its clearance checklist items.',
    { org_id: z.string().uuid(), offboarding_id: z.string().uuid() },
    safeTool(async ({ org_id, offboarding_id }) => {
      await assertOrgUsable(org_id)
      const { data, error } = await supabase
        .from('offboarding_records')
        .select(`${OFFBOARDING_SELECT}, clearance_progress(id, status, cleared_at, remarks)`)
        .eq('organization_id', org_id)
        .eq('id', offboarding_id)
        .maybeSingle()
      if (error) return errorResult(error.message)
      if (!data) return errorResult(`No offboarding record with id ${offboarding_id} found in org ${org_id}.`)
      return jsonResult(data)
    }),
  )
}
