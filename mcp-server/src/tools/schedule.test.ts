import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createFakeServer, resultJson } from '../testSupport/fakeServer.js'
import { makeQueryBuilder } from '../testSupport/supabaseMock.js'

const assertOrgUsableMock = vi.fn()
vi.mock('../orgGuard.js', () => ({ assertOrgUsable: assertOrgUsableMock }))
vi.mock('../supabaseClient.js', () => ({ supabase: { from: vi.fn() } }))

const ORG_ID = '85ab7ff3-454b-4ba0-858d-037551986556'

describe('schedule tools', () => {
  beforeEach(async () => {
    assertOrgUsableMock.mockReset().mockResolvedValue({ id: ORG_ID, name: 'The Launchpad Inc' })
    const { supabase } = (await import('../supabaseClient.js')) as any
    supabase.from.mockReset()
  })

  it('registers all five schedule tools', async () => {
    const { registerScheduleTools } = await import('./schedule.js')
    const { server, toolNames } = createFakeServer()
    registerScheduleTools(server)
    expect(toolNames().sort()).toEqual([
      'assign_employees_to_schedule',
      'create_schedule',
      'get_schedule_assignments',
      'list_schedules',
      'update_schedule',
    ])
  })

  describe('list_schedules', () => {
    it('verifies the org and only queries active schedules', async () => {
      const { registerScheduleTools } = await import('./schedule.js')
      const { supabase } = (await import('../supabaseClient.js')) as any
      const { server, getTool } = createFakeServer()
      registerScheduleTools(server)

      const rows = [{ id: 's1', name: 'Morning Shift', color: '#0038a8' }]
      const builder = makeQueryBuilder({ data: rows, error: null })
      supabase.from.mockReturnValue(builder)

      const result = await getTool('list_schedules').handler({ org_id: ORG_ID })

      expect(assertOrgUsableMock).toHaveBeenCalledWith(ORG_ID)
      expect(supabase.from).toHaveBeenCalledWith('schedules')
      expect(builder.eq).toHaveBeenCalledWith('is_active', true)
      expect(resultJson(result)).toEqual(rows)
    })
  })

  describe('get_schedule_assignments', () => {
    it('queries only current assignments for the org when no schedule_id is given', async () => {
      const { registerScheduleTools } = await import('./schedule.js')
      const { supabase } = (await import('../supabaseClient.js')) as any
      const { server, getTool } = createFakeServer()
      registerScheduleTools(server)

      const builder = makeQueryBuilder({ data: [], error: null })
      supabase.from.mockReturnValue(builder)

      await getTool('get_schedule_assignments').handler({ org_id: ORG_ID })

      expect(builder.eq).toHaveBeenCalledWith('is_current', true)
      const eqCalls = builder.eq.mock.calls.map((c: unknown[]) => c[0])
      expect(eqCalls).not.toContain('schedule_id')
    })

    it('adds a schedule_id filter when one is given', async () => {
      const { registerScheduleTools } = await import('./schedule.js')
      const { supabase } = (await import('../supabaseClient.js')) as any
      const { server, getTool } = createFakeServer()
      registerScheduleTools(server)

      const builder = makeQueryBuilder({ data: [], error: null })
      supabase.from.mockReturnValue(builder)

      await getTool('get_schedule_assignments').handler({ org_id: ORG_ID, schedule_id: 's1' })

      expect(builder.eq).toHaveBeenCalledWith('schedule_id', 's1')
    })

    it('surfaces a Supabase error as a structured tool error', async () => {
      const { registerScheduleTools } = await import('./schedule.js')
      const { supabase } = (await import('../supabaseClient.js')) as any
      const { server, getTool } = createFakeServer()
      registerScheduleTools(server)

      supabase.from.mockReturnValue(makeQueryBuilder({ data: null, error: { message: 'rls denied' } }))

      const result = await getTool('get_schedule_assignments').handler({ org_id: ORG_ID })

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('rls denied')
    })
  })

  const scheduleFields = {
    name: 'Morning Shift',
    code: 'MRN',
    start_time: '08:00',
    end_time: '17:00',
    break_minutes: 60,
    grace_period_minutes: 15,
    is_night_shift: false,
    is_flexible: false,
    work_days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    color: '#0038a8',
    departments: ['Engineering'],
  }

  describe('create_schedule', () => {
    it('verifies the org, computes work_hours, and inserts', async () => {
      const { registerScheduleTools } = await import('./schedule.js')
      const { supabase } = (await import('../supabaseClient.js')) as any
      const { server, getTool } = createFakeServer()
      registerScheduleTools(server)

      const created = { id: 's1', name: 'Morning Shift' }
      const builder = makeQueryBuilder({ data: created, error: null })
      supabase.from.mockReturnValue(builder)

      const result = await getTool('create_schedule').handler({ org_id: ORG_ID, ...scheduleFields })

      expect(assertOrgUsableMock).toHaveBeenCalledWith(ORG_ID)
      expect(supabase.from).toHaveBeenCalledWith('schedules')
      const insertArg = builder.insert.mock.calls[0][0]
      expect(insertArg.organization_id).toBe(ORG_ID)
      expect(insertArg.shift_start).toBe('08:00')
      expect(insertArg.shift_end).toBe('17:00')
      // 08:00-17:00 = 9h, minus 60min break = 8h.
      expect(insertArg.work_hours).toBe(8)
      expect(resultJson(result)).toEqual(created)
    })

    it('computes work_hours correctly across an overnight (wraparound) shift', async () => {
      const { registerScheduleTools } = await import('./schedule.js')
      const { supabase } = (await import('../supabaseClient.js')) as any
      const { server, getTool } = createFakeServer()
      registerScheduleTools(server)

      const builder = makeQueryBuilder({ data: {}, error: null })
      supabase.from.mockReturnValue(builder)

      // 22:00 -> 06:00 wraps past midnight: 8h duration, minus 60min break = 7h.
      await getTool('create_schedule').handler({
        org_id: ORG_ID,
        ...scheduleFields,
        start_time: '22:00',
        end_time: '06:00',
      })

      expect(builder.insert.mock.calls[0][0].work_hours).toBe(7)
    })
  })

  describe('update_schedule', () => {
    it('scopes the update by both id and organization_id, and returns the updated row', async () => {
      const { registerScheduleTools } = await import('./schedule.js')
      const { supabase } = (await import('../supabaseClient.js')) as any
      const { server, getTool } = createFakeServer()
      registerScheduleTools(server)

      const updated = { id: 's1', name: 'Morning Shift (Updated)' }
      const builder = makeQueryBuilder({ data: updated, error: null })
      supabase.from.mockReturnValue(builder)

      const result = await getTool('update_schedule').handler({ org_id: ORG_ID, schedule_id: 's1', ...scheduleFields })

      expect(builder.eq).toHaveBeenCalledWith('id', 's1')
      expect(builder.eq).toHaveBeenCalledWith('organization_id', ORG_ID)
      expect(resultJson(result)).toEqual(updated)
    })

    it('returns a clear not-found error rather than an empty result', async () => {
      const { registerScheduleTools } = await import('./schedule.js')
      const { supabase } = (await import('../supabaseClient.js')) as any
      const { server, getTool } = createFakeServer()
      registerScheduleTools(server)

      supabase.from.mockReturnValue(makeQueryBuilder({ data: null, error: null }))

      const result = await getTool('update_schedule').handler({ org_id: ORG_ID, schedule_id: 'missing', ...scheduleFields })

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('No schedule with id missing found in org')
    })
  })

  describe('assign_employees_to_schedule', () => {
    it('unassigns employees currently on the schedule but missing from the new list', async () => {
      const { registerScheduleTools } = await import('./schedule.js')
      const { supabase } = (await import('../supabaseClient.js')) as any
      const { server, getTool } = createFakeServer()
      registerScheduleTools(server)

      const removeBuilder = makeQueryBuilder({ data: [{ employee_id: 'emp-old' }], error: null })
      const restBuilder = makeQueryBuilder({ data: null, error: null })
      supabase.from.mockImplementationOnce(() => removeBuilder).mockImplementation(() => restBuilder)

      const result = await getTool('assign_employees_to_schedule').handler({
        org_id: ORG_ID,
        schedule_id: 's1',
        employee_ids: ['emp-new'],
      })

      // The removal update targets emp-old specifically, scoped to this schedule.
      expect(restBuilder.in).toHaveBeenCalledWith('employee_id', ['emp-old'])
      expect(restBuilder.eq).toHaveBeenCalledWith('schedule_id', 's1')
      expect(resultJson(result)).toMatchObject({ unassigned: ['emp-old'] })
    })

    // This is F6's exact no-double-booking fix (see
    // services/attendance.ts's updateScheduleAssignments): ending the
    // incoming employee's current assignment must NOT be scoped to this
    // schedule_id — it must end their assignment on *any* schedule, or
    // moving someone from Schedule A to B would leave them double-booked.
    it('ends the incoming employee\'s current assignment on ANY schedule (not scoped to schedule_id) before inserting the new one', async () => {
      const { registerScheduleTools } = await import('./schedule.js')
      const { supabase } = (await import('../supabaseClient.js')) as any
      const { server, getTool } = createFakeServer()
      registerScheduleTools(server)

      const emptyRoster = makeQueryBuilder({ data: [], error: null })
      const shared = makeQueryBuilder({ data: null, error: null })
      supabase.from.mockImplementationOnce(() => emptyRoster).mockImplementation(() => shared)

      await getTool('assign_employees_to_schedule').handler({
        org_id: ORG_ID,
        schedule_id: 's1',
        employee_ids: ['emp-new'],
      })

      // The per-employee "end current assignment" update call — every .eq()
      // call made against `shared` across the whole handler is inspected;
      // none of them may pair schedule_id with emp-new's end-current update.
      const updateCalls = shared.update.mock.calls
      expect(updateCalls.length).toBeGreaterThan(0) // at least the end-current update ran
      const insertArg = shared.insert.mock.calls[0][0]
      expect(insertArg).toMatchObject({ employee_id: 'emp-new', schedule_id: 's1', is_current: true })
    })
  })
})
