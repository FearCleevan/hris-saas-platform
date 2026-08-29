// Deno port of mcp-server/src/tools/offboarding.ts.
import { z } from 'npm:zod@4'
import { supabase } from '../lib/supabaseClient.ts'
import { assertOrgUsable } from '../lib/orgGuard.ts'
import { resolveEffectiveActor } from '../lib/actor.ts'
import { withActorClaims } from '../lib/db.ts'
import { safeTool, jsonResult, errorResult } from '../lib/toolResult.ts'
import type { ToolDef } from './types.ts'

const OFFBOARDING_SELECT =
  'id, employee_id, separation_type, last_day_of_work, clearance_status, final_pay_status, final_pay_amount, final_pay_date, notes, created_at'

const CLEARANCE_ITEM_STATUSES = ['pending', 'cleared', 'held'] as const
const FINAL_PAY_STATUSES = ['pending', 'computed', 'approved', 'released'] as const

// NOT auto-completion: the app's own updateClearanceItem()/
// updateFinalPayStatus() automatically call complete_offboarding() the
// moment both clearance and final pay reach their terminal state — meaning,
// in the UI, marking one last clearance checkbox can silently terminate an
// employee as a side effect. That's acceptable for a human clicking through
// a form with full context, but not for an MCP tool: an incidental "mark
// this item cleared" call should never itself terminate someone. This
// server keeps the parent offboarding_records.clearance_status rollup in
// sync (so data stays consistent) but requires an explicit, separately-
// confirmed call to complete_offboarding to actually complete offboarding.

export const listOffboardingRecordsTool: ToolDef<{ org_id: string }> = {
  name: 'list_offboarding_records',
  description: 'List offboarding records for an org.',
  schema: { org_id: z.string().uuid() },
  handler: safeTool(async ({ org_id }) => {
    await assertOrgUsable(org_id)
    const { data, error } = await supabase
      .from('offboarding_records')
      .select(OFFBOARDING_SELECT)
      .eq('organization_id', org_id)
      .order('created_at', { ascending: false })
    if (error) return errorResult(error.message)
    return jsonResult(data)
  }),
}

export const getOffboardingDetailTool: ToolDef<{ org_id: string; offboarding_id: string }> = {
  name: 'get_offboarding_detail',
  description: 'Get one offboarding record by id, including its clearance checklist items.',
  schema: { org_id: z.string().uuid(), offboarding_id: z.string().uuid() },
  handler: safeTool(async ({ org_id, offboarding_id }) => {
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
}

export const updateClearanceItemTool: ToolDef = {
  name: 'update_clearance_item',
  description:
    'Update one clearance checklist item (status, remarks) and keep the parent offboarding record\'s rollup ' +
    'clearance_status in sync. Does NOT auto-complete offboarding even if this is the last item cleared — call ' +
    'complete_offboarding explicitly (with confirm: true) once both clearance and final pay are ready. This is a ' +
    'deliberate difference from the app\'s own UI — see this file\'s header comment.',
  schema: {
    org_id: z.string().uuid(),
    clearance_progress_id: z.string().uuid(),
    status: z.enum(CLEARANCE_ITEM_STATUSES),
    remarks: z.string().optional(),
    actor_email: z.string().email().optional(),
  },
  handler: safeTool(async ({ org_id, clearance_progress_id, status, remarks, actor_email }) => {
    await assertOrgUsable(org_id)
    const actor = await resolveEffectiveActor(actor_email)

    const { data: updated, error: updateError } = await supabase
      .from('clearance_progress')
      .update({
        status,
        cleared_at: status === 'cleared' ? new Date().toISOString() : null,
        cleared_by: status === 'cleared' ? actor.sub : null,
        ...(remarks !== undefined ? { remarks } : {}),
      })
      .eq('id', clearance_progress_id)
      .eq('organization_id', org_id)
      .select('id, offboarding_id, status')
      .maybeSingle()
    if (updateError) return errorResult(updateError.message)
    if (!updated) return errorResult(`No clearance item with id ${clearance_progress_id} found in org ${org_id}.`)

    const { data: siblings, error: siblingsError } = await supabase
      .from('clearance_progress')
      .select('status')
      .eq('offboarding_id', updated.offboarding_id)
      .eq('organization_id', org_id)
    if (siblingsError) return errorResult(siblingsError.message)

    const items = siblings ?? []
    const allCleared = items.every((i: { status: string }) => i.status === 'cleared')
    const anyHeld = items.some((i: { status: string }) => i.status === 'held')
    const rollupStatus = allCleared ? 'cleared' : anyHeld ? 'held' : 'in_progress'

    const { error: rollupError } = await supabase
      .from('offboarding_records')
      .update({ clearance_status: rollupStatus })
      .eq('id', updated.offboarding_id)
      .eq('organization_id', org_id)
    if (rollupError) return errorResult(rollupError.message)

    return jsonResult({
      clearance_progress_id,
      status,
      offboarding_id: updated.offboarding_id,
      clearance_status_rollup: rollupStatus,
      note:
        rollupStatus === 'cleared'
          ? 'Clearance is now fully cleared, but offboarding was NOT auto-completed — call complete_offboarding explicitly if final pay is also released.'
          : undefined,
    })
  }),
}

export const updateFinalPayStatusTool: ToolDef = {
  name: 'update_final_pay_status',
  description:
    'Update an offboarding record\'s final pay status/amount. Does NOT auto-complete offboarding even if this ' +
    'reaches "released" with clearance already cleared — call complete_offboarding explicitly. See this file\'s ' +
    'header comment.',
  schema: {
    org_id: z.string().uuid(),
    offboarding_id: z.string().uuid(),
    status: z.enum(FINAL_PAY_STATUSES),
    amount: z.number().nonnegative().optional(),
    actor_email: z.string().email().optional(),
  },
  handler: safeTool(async ({ org_id, offboarding_id, status, amount }) => {
    await assertOrgUsable(org_id)

    const { data, error } = await supabase
      .from('offboarding_records')
      .update({
        final_pay_status: status,
        ...(amount !== undefined ? { final_pay_amount: amount } : {}),
        ...(status === 'released' ? { final_pay_date: new Date().toISOString().slice(0, 10) } : {}),
      })
      .eq('id', offboarding_id)
      .eq('organization_id', org_id)
      .select('id, clearance_status, final_pay_status')
      .maybeSingle()
    if (error) return errorResult(error.message)
    if (!data) return errorResult(`No offboarding record with id ${offboarding_id} found in org ${org_id}.`)

    return jsonResult({
      ...data,
      note:
        status === 'released' && data.clearance_status === 'cleared'
          ? 'Final pay is now released and clearance is already cleared, but offboarding was NOT auto-completed — call complete_offboarding explicitly.'
          : undefined,
    })
  }),
}

export const completeOffboardingTool: ToolDef<{
  org_id: string
  offboarding_id: string
  confirm: boolean
  actor_email?: string
}> = {
  name: 'complete_offboarding',
  description:
    'Complete an offboarding record, which terminates the employee (sets is_active=false, status=terminated via ' +
    'delete_employees_hard). Requires confirm: true. The underlying RPC itself requires clearance_status=\'cleared\' ' +
    'AND final_pay_status=\'released\' first, and is safe to call twice (idempotent) if already complete.',
  schema: {
    org_id: z.string().uuid(),
    offboarding_id: z.string().uuid(),
    confirm: z.boolean().default(false),
    actor_email: z.string().email().optional(),
  },
  handler: safeTool(async ({ org_id, offboarding_id, confirm, actor_email }) => {
    await assertOrgUsable(org_id)
    if (!confirm) {
      return errorResult(
        `Completing offboarding ${offboarding_id} in org ${org_id} will TERMINATE the associated employee ` +
          `(is_active=false, status=terminated) — no undo path. Re-call with confirm: true to proceed.`,
      )
    }
    const actor = await resolveEffectiveActor(actor_email)

    return withActorClaims(actor, async (query) => {
      await query('SELECT complete_offboarding($1)', [offboarding_id])
      return jsonResult({ org_id, offboarding_id, completed: true })
    })
  }),
}

export const offboardingTools: ToolDef[] = [
  listOffboardingRecordsTool,
  getOffboardingDetailTool,
  updateClearanceItemTool,
  updateFinalPayStatusTool,
  completeOffboardingTool,
]
