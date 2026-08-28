import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { supabase } from '../supabaseClient.js'
import { assertOrgUsable } from '../orgGuard.js'
import { safeTool, jsonResult, errorResult } from '../toolResult.js'

const SCHEDULE_SELECT =
  'id, name, code, shift_start, shift_end, break_minutes, grace_period_minutes, work_hours, is_night_shift, is_flexible, color, departments, work_days'

const WORK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const

// Mirrors apps/hris-admin-dashboard's calcWorkHours() (SchedulePage.tsx) /
// calcWorkHoursFromTimes() (services/attendance.ts) exactly — including the
// overnight-shift wraparound (end <= start means it crosses midnight).
function calcWorkHours(startTime: string, endTime: string, breakMinutes: number): number {
  const [sh, sm] = startTime.split(':').map(Number)
  const [eh, em] = endTime.split(':').map(Number)
  const startMins = sh * 60 + sm
  let endMins = eh * 60 + em
  if (endMins <= startMins) endMins += 24 * 60
  return Math.max(0, parseFloat(((endMins - startMins - breakMinutes) / 60).toFixed(1)))
}

const scheduleFields = {
  name: z.string().min(1),
  code: z.string().min(1).max(6),
  start_time: z.string().regex(/^\d{2}:\d{2}$/, 'HH:MM'),
  end_time: z.string().regex(/^\d{2}:\d{2}$/, 'HH:MM'),
  break_minutes: z.number().int().min(0).default(60),
  grace_period_minutes: z.number().int().min(0).default(15),
  is_night_shift: z.boolean().default(false),
  is_flexible: z.boolean().default(false),
  work_days: z.array(z.enum(WORK_DAYS)).min(1),
  color: z.string().default('#0038a8'),
  departments: z.array(z.string()).default([]),
}

export function registerScheduleTools(server: McpServer) {
  server.tool(
    'list_schedules',
    'List active shift schedules for an org.',
    { org_id: z.string().uuid() },
    safeTool(async ({ org_id }) => {
      await assertOrgUsable(org_id)
      const { data, error } = await supabase
        .from('schedules')
        .select(SCHEDULE_SELECT)
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

  server.tool(
    'create_schedule',
    'Create a new shift schedule for an org. Not guarded — purely additive, no existing data at risk.',
    { org_id: z.string().uuid(), ...scheduleFields },
    safeTool(async ({ org_id, ...fields }) => {
      await assertOrgUsable(org_id)
      const { data, error } = await supabase
        .from('schedules')
        .insert({
          organization_id: org_id,
          name: fields.name,
          code: fields.code,
          shift_start: fields.start_time,
          shift_end: fields.end_time,
          break_minutes: fields.break_minutes,
          grace_period_minutes: fields.grace_period_minutes,
          work_hours: calcWorkHours(fields.start_time, fields.end_time, fields.break_minutes),
          is_night_shift: fields.is_night_shift,
          is_flexible: fields.is_flexible,
          is_active: true,
          color: fields.color,
          departments: fields.departments,
          work_days: fields.work_days,
        })
        .select(SCHEDULE_SELECT)
        .single()
      if (error) return errorResult(error.message)
      return jsonResult(data)
    }),
  )

  server.tool(
    'update_schedule',
    'Update an existing shift schedule\'s config (times, color, departments, work days). Not guarded — reversible ' +
      'by another update, and touches no employee assignments.',
    { org_id: z.string().uuid(), schedule_id: z.string().uuid(), ...scheduleFields },
    safeTool(async ({ org_id, schedule_id, ...fields }) => {
      await assertOrgUsable(org_id)
      const { data, error } = await supabase
        .from('schedules')
        .update({
          name: fields.name,
          code: fields.code,
          shift_start: fields.start_time,
          shift_end: fields.end_time,
          break_minutes: fields.break_minutes,
          grace_period_minutes: fields.grace_period_minutes,
          work_hours: calcWorkHours(fields.start_time, fields.end_time, fields.break_minutes),
          is_night_shift: fields.is_night_shift,
          is_flexible: fields.is_flexible,
          color: fields.color,
          departments: fields.departments,
          work_days: fields.work_days,
        })
        .eq('id', schedule_id)
        .eq('organization_id', org_id)
        .select(SCHEDULE_SELECT)
        .maybeSingle()
      if (error) return errorResult(error.message)
      if (!data) return errorResult(`No schedule with id ${schedule_id} found in org ${org_id}.`)
      return jsonResult(data)
    }),
  )

  server.tool(
    'assign_employees_to_schedule',
    'Set the full list of employees currently assigned to a schedule. Reproduces ' +
      'services/attendance.ts\'s updateScheduleAssignments() exactly: for every incoming employee, ends their ' +
      'current assignment on *any* schedule first (not just this one) before inserting the new one — this is the ' +
      'no-double-booking behavior F6 of the QA checklist verified. Employees on this schedule but missing from ' +
      'employee_ids are unassigned. Not guarded — reassignment is a routine, reversible HR operation.',
    { org_id: z.string().uuid(), schedule_id: z.string().uuid(), employee_ids: z.array(z.string().uuid()) },
    safeTool(async ({ org_id, schedule_id, employee_ids }) => {
      await assertOrgUsable(org_id)
      const today = new Date().toISOString().slice(0, 10)
      const incoming = new Set(employee_ids)

      const { data: currentOnSchedule, error: currentErr } = await supabase
        .from('employee_schedules')
        .select('employee_id')
        .eq('schedule_id', schedule_id)
        .eq('organization_id', org_id)
        .eq('is_current', true)
      if (currentErr) return errorResult(currentErr.message)

      const removedIds = (currentOnSchedule ?? [])
        .map((r: { employee_id: string }) => r.employee_id)
        .filter((id: string) => !incoming.has(id))

      if (removedIds.length > 0) {
        const { error } = await supabase
          .from('employee_schedules')
          .update({ is_current: false, end_date: today })
          .in('employee_id', removedIds)
          .eq('schedule_id', schedule_id)
          .eq('organization_id', org_id)
          .eq('is_current', true)
        if (error) return errorResult(error.message)
      }

      for (const empId of employee_ids) {
        const { error: endErr } = await supabase
          .from('employee_schedules')
          .update({ is_current: false, end_date: today })
          .eq('employee_id', empId)
          .eq('organization_id', org_id)
          .eq('is_current', true)
        if (endErr) return errorResult(endErr.message)

        const { error: insErr } = await supabase.from('employee_schedules').insert({
          employee_id: empId,
          organization_id: org_id,
          schedule_id,
          effective_date: today,
          is_current: true,
        })
        if (insErr) return errorResult(insErr.message)
      }

      return jsonResult({ org_id, schedule_id, assigned: employee_ids, unassigned: removedIds })
    }),
  )
}
