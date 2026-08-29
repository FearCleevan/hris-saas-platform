// Deno port of mcp-server/src/tools/payroll.ts.
import { z } from 'npm:zod@4'
import { supabase } from '../lib/supabaseClient.ts'
import { assertOrgUsable } from '../lib/orgGuard.ts'
import { resolveEffectiveActor } from '../lib/actor.ts'
import { safeTool, jsonResult, errorResult } from '../lib/toolResult.ts'
import type { ToolDef } from './types.ts'

async function settleDispute(
  orgId: string,
  disputeId: string,
  status: 'resolved' | 'rejected',
  resolution: string,
  actorEmail: string | undefined,
) {
  const actor = await resolveEffectiveActor(actorEmail)

  const { data, error } = await supabase
    .from('payroll_disputes')
    .update({ status, resolution, resolved_by: actor.sub, resolved_at: new Date().toISOString() })
    .eq('id', disputeId)
    .eq('organization_id', orgId)
    .select('id, status, resolution, resolved_at')
    .maybeSingle()
  if (error) return errorResult(error.message)
  if (!data) return errorResult(`No payroll dispute with id ${disputeId} found in org ${orgId}.`)
  return jsonResult(data)
}

export const listPayrollRunsTool: ToolDef<{ org_id: string }> = {
  name: 'list_payroll_runs',
  description: 'List payroll runs for an org, with period details.',
  schema: { org_id: z.string().uuid() },
  handler: safeTool(async ({ org_id }) => {
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
}

export const listPayrollDisputesTool: ToolDef<{
  org_id: string
  status?: 'open' | 'under_review' | 'resolved' | 'rejected'
}> = {
  name: 'list_payroll_disputes',
  description: 'List payroll disputes for an org, optionally filtered by status.',
  schema: {
    org_id: z.string().uuid(),
    status: z.enum(['open', 'under_review', 'resolved', 'rejected']).optional(),
  },
  handler: safeTool(async ({ org_id, status }) => {
    await assertOrgUsable(org_id)
    let q = supabase
      .from('payroll_disputes')
      .select('id, payslip_id, employee_id, reason, status, resolution, resolved_at, created_at')
      .eq('organization_id', org_id)
    // payroll_disputes.status is a plain text column, not a DB enum — the
    // app's own getPayrollDisputes() normalizes a legacy 'review' literal
    // to 'under_review' client-side. Match both here so filtering by
    // 'under_review' doesn't silently miss old rows.
    if (status === 'under_review') q = q.in('status', ['under_review', 'review'])
    else if (status) q = q.eq('status', status)
    const { data, error } = await q.order('created_at', { ascending: false })
    if (error) return errorResult(error.message)
    return jsonResult(data)
  }),
}

export const resolveDisputeTool: ToolDef<{
  org_id: string
  dispute_id: string
  resolution: string
  actor_email?: string
}> = {
  name: 'resolve_dispute',
  description:
    'Mark a payroll dispute resolved, with a resolution note. Not guarded — a routine business decision, ' +
    'correctable by resolving/rejecting again if needed.',
  schema: {
    org_id: z.string().uuid(),
    dispute_id: z.string().uuid(),
    resolution: z.string().min(1),
    actor_email: z.string().email().optional(),
  },
  handler: safeTool(async ({ org_id, dispute_id, resolution, actor_email }) => {
    await assertOrgUsable(org_id)
    return settleDispute(org_id, dispute_id, 'resolved', resolution, actor_email)
  }),
}

export const rejectDisputeTool: ToolDef<{
  org_id: string
  dispute_id: string
  resolution: string
  actor_email?: string
}> = {
  name: 'reject_dispute',
  description: 'Reject a payroll dispute, with a resolution note explaining why. Not guarded — same reasoning as resolve_dispute.',
  schema: {
    org_id: z.string().uuid(),
    dispute_id: z.string().uuid(),
    resolution: z.string().min(1),
    actor_email: z.string().email().optional(),
  },
  handler: safeTool(async ({ org_id, dispute_id, resolution, actor_email }) => {
    await assertOrgUsable(org_id)
    return settleDispute(org_id, dispute_id, 'rejected', resolution, actor_email)
  }),
}

export const payrollTools: ToolDef[] = [
  listPayrollRunsTool,
  listPayrollDisputesTool,
  resolveDisputeTool,
  rejectDisputeTool,
]
