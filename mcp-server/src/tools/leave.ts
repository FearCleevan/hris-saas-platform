import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { supabase } from '../supabaseClient.js'
import { assertOrgUsable } from '../orgGuard.js'
import { safeTool, jsonResult, errorResult } from '../toolResult.js'

export function registerLeaveTools(server: McpServer) {
  server.tool(
    'list_leave_types',
    'List configured leave types for an org.',
    { org_id: z.string().uuid() },
    safeTool(async ({ org_id }) => {
      await assertOrgUsable(org_id)
      const { data, error } = await supabase
        .from('leave_types')
        .select('id, name, code, description, is_paid, is_mandatory, requires_document, max_days_per_year, carry_over_days, is_active')
        .eq('organization_id', org_id)
        .order('name')
      if (error) return errorResult(error.message)
      return jsonResult(data)
    }),
  )

  server.tool(
    'list_leave_requests',
    'List leave requests for an org, optionally filtered by status.',
    {
      org_id: z.string().uuid(),
      status: z.enum(['pending', 'approved', 'rejected', 'cancelled']).optional(),
      limit: z.number().int().min(1).max(200).default(50),
    },
    safeTool(async ({ org_id, status, limit }) => {
      await assertOrgUsable(org_id)
      let q = supabase
        .from('leave_requests')
        .select('id, employee_id, leave_type_id, start_date, end_date, total_days, reason, status, remarks, approved_at, created_at')
        .eq('organization_id', org_id)
      if (status) q = q.eq('status', status)
      const { data, error } = await q.order('created_at', { ascending: false }).limit(limit)
      if (error) return errorResult(error.message)
      return jsonResult(data)
    }),
  )

  server.tool(
    'get_leave_balances',
    'Get leave balances for an org, optionally filtered to one employee and/or year (defaults to the current year).',
    { org_id: z.string().uuid(), employee_id: z.string().uuid().optional(), year: z.number().int().optional() },
    safeTool(async ({ org_id, employee_id, year }) => {
      await assertOrgUsable(org_id)
      let q = supabase
        .from('leave_balances')
        .select('id, employee_id, leave_type_id, year, entitled_days, used_days, pending_days, carried_over, balance')
        .eq('organization_id', org_id)
        .eq('year', year ?? new Date().getFullYear())
      if (employee_id) q = q.eq('employee_id', employee_id)
      const { data, error } = await q
      if (error) return errorResult(error.message)
      return jsonResult(data)
    }),
  )
}
