import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { supabase } from '../supabaseClient.js'
import { assertOrgUsable } from '../orgGuard.js'
import { resolveEffectiveActor } from '../actor.js'
import { withActorClaims } from '../db.js'
import { safeTool, jsonResult, errorResult } from '../toolResult.js'

// Mirrors apps/hris-admin-dashboard/src/services/employees.ts's getEmployees()
// select shape exactly, so results line up with what the app itself shows.
const EMPLOYEE_SELECT = `
  id, employee_no, first_name, last_name, middle_name,
  date_of_birth, avatar_url, status, is_active, work_email,
  employee_employment!employee_id(
    date_hired, is_current, direct_manager_id,
    departments(name),
    positions(title),
    employment_types(name, code)
  ),
  employee_compensation(basic_salary, is_current)
`

export function registerEmployeeTools(server: McpServer) {
  server.tool(
    'search_employees',
    'List employees for an org, optionally filtered to active-only and/or by a name search term.',
    {
      org_id: z.string().uuid(),
      active_only: z.boolean().default(true),
      query: z.string().optional(),
      limit: z.number().int().min(1).max(200).default(50),
    },
    safeTool(async ({ org_id, active_only, query, limit }) => {
      await assertOrgUsable(org_id)

      let q = supabase.from('employees').select(EMPLOYEE_SELECT).eq('organization_id', org_id)
      if (active_only) q = q.eq('is_active', true)
      if (query) {
        const sanitized = query.replace(/[(),]/g, '')
        q = q.or(`first_name.ilike.%${sanitized}%,last_name.ilike.%${sanitized}%,employee_no.ilike.%${sanitized}%`)
      }

      const { data, error } = await q.order('last_name').limit(limit)
      if (error) return errorResult(error.message)
      return jsonResult(data)
    }),
  )

  server.tool(
    'get_employee',
    'Get a single employee by id, including employment and compensation info.',
    { org_id: z.string().uuid(), employee_id: z.string().uuid() },
    safeTool(async ({ org_id, employee_id }) => {
      await assertOrgUsable(org_id)

      const { data, error } = await supabase
        .from('employees')
        .select(EMPLOYEE_SELECT)
        .eq('organization_id', org_id)
        .eq('id', employee_id)
        .maybeSingle()

      if (error) return errorResult(error.message)
      if (!data) return errorResult(`No employee with id ${employee_id} found in org ${org_id}.`)
      return jsonResult(data)
    }),
  )

  server.tool(
    'bulk_terminate_employees',
    'Terminate one or more employees via the delete_employees_hard RPC (a soft-delete: sets is_active=false, ' +
      'status=terminated — nothing is actually deleted, preserving payroll/attendance/leave history for DOLE/legal ' +
      'compliance, but the employee immediately disappears from every active-only view). Requires confirm: true.',
    {
      org_id: z.string().uuid(),
      employee_ids: z.array(z.string().uuid()).min(1),
      confirm: z.boolean().default(false),
      actor_email: z.string().email().optional(),
    },
    safeTool(async ({ org_id, employee_ids, confirm, actor_email }) => {
      await assertOrgUsable(org_id)
      if (!confirm) {
        return errorResult(
          `Terminating ${employee_ids.length} employee(s) in org ${org_id} will remove them from every active ` +
            `view immediately. Their records are preserved (soft-delete), but there is no tool-level undo. ` +
            `Re-call with confirm: true to proceed.`,
        )
      }
      const actor = await resolveEffectiveActor(actor_email)

      return withActorClaims(actor, async (query) => {
        await query('SELECT delete_employees_hard($1)', [employee_ids])
        return jsonResult({ org_id, employee_ids, terminated: true })
      })
    }),
  )
}
