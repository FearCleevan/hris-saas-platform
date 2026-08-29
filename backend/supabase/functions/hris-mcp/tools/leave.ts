// Deno port of mcp-server/src/tools/leave.ts.
import { z } from 'npm:zod@4'
import { supabase } from '../lib/supabaseClient.ts'
import { assertOrgUsable } from '../lib/orgGuard.ts'
import { resolveEffectiveActor } from '../lib/actor.ts'
import { withActorClaims } from '../lib/db.ts'
import { safeTool, jsonResult, errorResult } from '../lib/toolResult.ts'
import type { ToolDef } from './types.ts'

// The standard Philippine leave-type set this server can seed into an org
// that has none. Hardcoded here (not copied from another org at runtime) so
// seeding one org never silently depends on some other org's rows still
// existing unchanged.
const DEFAULT_LEAVE_TYPES = [
  { name: 'Vacation Leave', code: 'VL', is_paid: true, is_mandatory: false, requires_document: false, max_days_per_year: 15, carry_over_days: 5 },
  { name: 'Sick Leave', code: 'SL', is_paid: true, is_mandatory: false, requires_document: false, max_days_per_year: 15, carry_over_days: 0 },
  { name: 'Maternity Leave', code: 'ML', is_paid: true, is_mandatory: true, requires_document: true, max_days_per_year: 105, carry_over_days: 0 },
  { name: 'Paternity Leave', code: 'PL', is_paid: true, is_mandatory: true, requires_document: false, max_days_per_year: 7, carry_over_days: 0 },
  { name: 'Solo Parent Leave', code: 'SPL', is_paid: true, is_mandatory: true, requires_document: false, max_days_per_year: 7, carry_over_days: 0 },
  { name: 'Bereavement Leave', code: 'BL', is_paid: true, is_mandatory: false, requires_document: false, max_days_per_year: 5, carry_over_days: 0 },
  { name: 'Emergency Leave', code: 'EL', is_paid: true, is_mandatory: false, requires_document: false, max_days_per_year: 3, carry_over_days: 0 },
  { name: 'Unpaid Leave', code: 'UL', is_paid: false, is_mandatory: false, requires_document: false, max_days_per_year: null, carry_over_days: 0 },
  { name: 'Service Incentive Leave', code: 'SIL', is_paid: true, is_mandatory: true, requires_document: false, max_days_per_year: 5, carry_over_days: 5 },
] as const

export const listLeaveTypesTool: ToolDef<{ org_id: string }> = {
  name: 'list_leave_types',
  description: 'List configured leave types for an org.',
  schema: { org_id: z.string().uuid() },
  handler: safeTool(async ({ org_id }) => {
    await assertOrgUsable(org_id)
    const { data, error } = await supabase
      .from('leave_types')
      .select('id, name, code, description, is_paid, is_mandatory, requires_document, max_days_per_year, carry_over_days, is_active')
      .eq('organization_id', org_id)
      .order('name')
    if (error) return errorResult(error.message)
    return jsonResult(data)
  }),
}

export const listLeaveRequestsTool: ToolDef<{
  org_id: string
  status?: 'pending' | 'approved' | 'rejected' | 'cancelled'
  limit: number
}> = {
  name: 'list_leave_requests',
  description: 'List leave requests for an org, optionally filtered by status.',
  schema: {
    org_id: z.string().uuid(),
    status: z.enum(['pending', 'approved', 'rejected', 'cancelled']).optional(),
    limit: z.number().int().min(1).max(200).default(50),
  },
  handler: safeTool(async ({ org_id, status, limit }) => {
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
}

export const getLeaveBalancesTool: ToolDef<{ org_id: string; employee_id?: string; year?: number }> = {
  name: 'get_leave_balances',
  description: 'Get leave balances for an org, optionally filtered to one employee and/or year (defaults to the current year).',
  schema: { org_id: z.string().uuid(), employee_id: z.string().uuid().optional(), year: z.number().int().optional() },
  handler: safeTool(async ({ org_id, employee_id, year }) => {
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
}

export const applyLeaveTool: ToolDef = {
  name: 'apply_leave',
  description:
    'File a new leave request for an employee and bump their pending_days balance. Reproduces services/leaves.ts\'s ' +
    'applyLeave() exactly, including its compensating rollback: if the balance update fails after the request ' +
    'insert succeeds, the just-inserted request is deleted rather than left as an orphaned "ghost" pending row.',
  schema: {
    org_id: z.string().uuid(),
    employee_id: z.string().uuid(),
    leave_type_id: z.string().uuid(),
    start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD'),
    end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD'),
    total_days: z.number().positive(),
    reason: z.string().min(1),
  },
  handler: safeTool(async ({ org_id, employee_id, leave_type_id, start_date, end_date, total_days, reason }) => {
    await assertOrgUsable(org_id)
    const year = new Date(start_date).getFullYear()

    const { data: inserted, error: insertError } = await supabase
      .from('leave_requests')
      .insert({
        employee_id,
        organization_id: org_id,
        leave_type_id,
        start_date,
        end_date,
        total_days,
        reason,
        status: 'pending',
      })
      .select('id')
      .single()
    if (insertError) return errorResult(insertError.message)

    const { data: existing, error: balanceFetchError } = await supabase
      .from('leave_balances')
      .select('id, pending_days')
      .eq('employee_id', employee_id)
      .eq('leave_type_id', leave_type_id)
      .eq('year', year)
      .maybeSingle()

    let balanceError = balanceFetchError
    if (!balanceError) {
      if (existing) {
        const { error } = await supabase
          .from('leave_balances')
          .update({ pending_days: Number(existing.pending_days) + total_days })
          .eq('id', existing.id)
        balanceError = error
      } else {
        const { error } = await supabase
          .from('leave_balances')
          .insert({ employee_id, organization_id: org_id, leave_type_id, year, pending_days: total_days })
        balanceError = error
      }
    }

    if (balanceError) {
      await supabase.from('leave_requests').delete().eq('id', inserted.id)
      return errorResult(balanceError.message)
    }

    return jsonResult({ org_id, request_id: inserted.id, employee_id, leave_type_id, total_days, status: 'pending' })
  }),
}

export const approveLeaveRequestTool: ToolDef<{
  org_id: string
  request_id: string
  remarks?: string
  actor_email?: string
}> = {
  name: 'approve_leave_request',
  description:
    'Approve a pending leave request via the approve_leave_request RPC, which atomically moves pending_days to ' +
    'used_days and writes a leave_credits_history row.',
  schema: {
    org_id: z.string().uuid(),
    request_id: z.string().uuid(),
    remarks: z.string().optional(),
    actor_email: z.string().email().optional(),
  },
  handler: safeTool(async ({ org_id, request_id, remarks, actor_email }) => {
    await assertOrgUsable(org_id)
    const actor = await resolveEffectiveActor(actor_email)

    return withActorClaims(actor, async (query) => {
      await query('SELECT approve_leave_request($1, $2)', [request_id, remarks ?? null])
      return jsonResult({ org_id, request_id, status: 'approved' })
    })
  }),
}

export const rejectLeaveRequestTool: ToolDef<{
  org_id: string
  request_id: string
  remarks?: string
  actor_email?: string
}> = {
  name: 'reject_leave_request',
  description:
    'Reject a pending leave request via the reject_leave_request RPC, which atomically reverses the pending_days ' +
    'bump applyLeave() added at submission.',
  schema: {
    org_id: z.string().uuid(),
    request_id: z.string().uuid(),
    remarks: z.string().optional(),
    actor_email: z.string().email().optional(),
  },
  handler: safeTool(async ({ org_id, request_id, remarks, actor_email }) => {
    await assertOrgUsable(org_id)
    const actor = await resolveEffectiveActor(actor_email)

    return withActorClaims(actor, async (query) => {
      await query('SELECT reject_leave_request($1, $2)', [request_id, remarks ?? null])
      return jsonResult({ org_id, request_id, status: 'rejected' })
    })
  }),
}

export const seedDefaultLeaveTypesTool: ToolDef<{ org_id: string; confirm: boolean }> = {
  name: 'seed_default_leave_types',
  description:
    'Seed the standard 9 Philippine leave types (Vacation, Sick, Maternity, Paternity, Solo Parent, Bereavement, ' +
    'Emergency, Unpaid, SIL) into an org that has none. Writes real, permanent org config — not disposable test ' +
    'data. Requires confirm: true. Refuses outright (no confirm override) if the org already has any leave ' +
    'types, to avoid silently double-seeding.',
  schema: { org_id: z.string().uuid(), confirm: z.boolean().default(false) },
  handler: safeTool(async ({ org_id, confirm }) => {
    await assertOrgUsable(org_id)

    const { count, error: countError } = await supabase
      .from('leave_types')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', org_id)
    if (countError) return errorResult(countError.message)
    if (count && count > 0) {
      return errorResult(`Org ${org_id} already has ${count} leave type(s) — refusing to double-seed.`)
    }

    if (!confirm) {
      return errorResult(
        `Seeding the standard 9 PH leave types into org ${org_id}. This writes permanent org config. ` +
          `Re-call with confirm: true to proceed.`,
      )
    }

    const { data, error } = await supabase
      .from('leave_types')
      .insert(DEFAULT_LEAVE_TYPES.map((t) => ({ ...t, organization_id: org_id })))
      .select('id, name, code')
    if (error) return errorResult(error.message)
    return jsonResult({ org_id, seeded: data })
  }),
}

export const leaveTools: ToolDef[] = [
  listLeaveTypesTool,
  listLeaveRequestsTool,
  getLeaveBalancesTool,
  applyLeaveTool,
  approveLeaveRequestTool,
  rejectLeaveRequestTool,
  seedDefaultLeaveTypesTool,
]
