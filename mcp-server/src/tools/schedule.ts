import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { supabase } from '../supabaseClient.js'
import { assertOrgUsable } from '../orgGuard.js'
import { safeTool, jsonResult, errorResult } from '../toolResult.js'

export function registerScheduleTools(server: McpServer) {
  server.tool(
    'list_schedules',
    'List active shift schedules for an org.',
    { org_id: z.string().uuid() },
    safeTool(async ({ org_id }) => {
      await assertOrgUsable(org_id)
      const { data, error } = await supabase
        .from('schedules')
        .select('id, name, code, shift_start, shift_end, break_minutes, grace_period_minutes, work_hours, is_night_shift, is_flexible, color, departments, work_days')
        .eq('organization_id', org_id)
        .eq('is_active', true)
        .order('name')
      if (error) return errorResult(error.message)
      return jsonResult(data)
    }),
  )

  server.tool(
    'get_schedule_assignments',
    'List current employee->schedule assignments for an org, optionally filtered to one schedule.',
    { org_id: z.string().uuid(), schedule_id: z.string().uuid().optional() },
    safeTool(async ({ org_id, schedule_id }) => {
      await assertOrgUsable(org_id)
      let q = supabase
        .from('employee_schedules')
        .select('id, employee_id, schedule_id, effective_date')
        .eq('organization_id', org_id)
        .eq('is_current', true)
      if (schedule_id) q = q.eq('schedule_id', schedule_id)
      const { data, error } = await q
      if (error) return errorResult(error.message)
      return jsonResult(data)
    }),
  )
}
