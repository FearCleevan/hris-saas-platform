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

  it('registers both schedule tools', async () => {
    const { registerScheduleTools } = await import('./schedule.js')
    const { server, toolNames } = createFakeServer()
    registerScheduleTools(server)
    expect(toolNames().sort()).toEqual(['get_schedule_assignments', 'list_schedules'])
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
})
