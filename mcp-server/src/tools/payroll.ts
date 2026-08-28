import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { supabase } from '../supabaseClient.js'
import { assertOrgUsable } from '../orgGuard.js'
import { safeTool, jsonResult, errorResult } from '../toolResult.js'

export function registerPayrollTools(server: McpServer) {
  server.tool(
    'list_payroll_runs',
    'List payroll runs for an org, with period details.',
    { org_id: z.string().uuid() },
    safeTool(async ({ org_id }) => {
      await assertOrgUsable(org_id)
      const { data, error } = await supabase
        .from('payroll_runs')
        .select(
          'id, status, total_employees, total_gross_pay, total_deductions, total_net_pay, ' +
            'payroll_periods!payroll_period_id ( id, name, period_start, period_end, pay_date, frequency )',
        )
        .eq('organization_id', org_id)
        .order('created_at', { ascending: false })
      if (error) return errorResult(error.message)
      return jsonResult(data)
    }),
  )

  server.tool(
    'list_payroll_disputes',
    'List payroll disputes for an org, optionally filtered by status.',
    {
      org_id: z.string().uuid(),
      status: z.enum(['open', 'under_review', 'resolved', 'rejected']).optional(),
    },
    safeTool(async ({ org_id, status }) => {
      await assertOrgUsable(org_id)
      let q = supabase
        .from('payroll_disputes')
        .select('id, payslip_id, employee_id, reason, status, resolution, resolved_at, created_at')
        .eq('organization_id', org_id)
      // payroll_disputes.status is a plain text column, not a DB enum — the
      // app's own getPayrollDisputes() normalizes a legacy 'review' literal
      // to 'under_review' client-side (services/payroll.ts:310). Match both
      // here so filtering by 'under_review' doesn't silently miss old rows.
      if (status === 'under_review') q = q.in('status', ['under_review', 'review'])
      else if (status) q = q.eq('status', status)
      const { data, error } = await q.order('created_at', { ascending: false })
      if (error) return errorResult(error.message)
      return jsonResult(data)
    }),
  )
}
