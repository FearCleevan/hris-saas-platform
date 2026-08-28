import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createFakeServer, resultJson } from '../testSupport/fakeServer.js'
import { makeQueryBuilder } from '../testSupport/supabaseMock.js'

const assertOrgUsableMock = vi.fn()
vi.mock('../orgGuard.js', () => ({ assertOrgUsable: assertOrgUsableMock }))
vi.mock('../supabaseClient.js', () => ({ supabase: { from: vi.fn() } }))

const ORG_ID = '85ab7ff3-454b-4ba0-858d-037551986556'

describe('leave tools', () => {
  beforeEach(async () => {
    assertOrgUsableMock.mockReset().mockResolvedValue({ id: ORG_ID, name: 'The Launchpad Inc' })
    const { supabase } = (await import('../supabaseClient.js')) as any
    supabase.from.mockReset()
  })

  it('registers all three leave tools', async () => {
    const { registerLeaveTools } = await import('./leave.js')
    const { server, toolNames } = createFakeServer()
    registerLeaveTools(server)
    expect(toolNames().sort()).toEqual(['get_leave_balances', 'list_leave_requests', 'list_leave_types'])
  })

  describe('list_leave_types', () => {
    it('verifies the org and returns the configured types', async () => {
      const { registerLeaveTools } = await import('./leave.js')
      const { supabase } = (await import('../supabaseClient.js')) as any
      const { server, getTool } = createFakeServer()
      registerLeaveTools(server)

      const rows = [{ id: 'lt1', name: 'Vacation Leave', code: 'VL' }]
      supabase.from.mockReturnValue(makeQueryBuilder({ data: rows, error: null }))

      const result = await getTool('list_leave_types').handler({ org_id: ORG_ID })

      expect(assertOrgUsableMock).toHaveBeenCalledWith(ORG_ID)
      expect(resultJson(result)).toEqual(rows)
    })
  })

  describe('list_leave_requests', () => {
    it('does not filter by status when none is given', async () => {
      const { registerLeaveTools } = await import('./leave.js')
      const { supabase } = (await import('../supabaseClient.js')) as any
      const { server, getTool } = createFakeServer()
      registerLeaveTools(server)

      const builder = makeQueryBuilder({ data: [], error: null })
      supabase.from.mockReturnValue(builder)

      await getTool('list_leave_requests').handler({ org_id: ORG_ID, limit: 50 })

      const eqCalls = builder.eq.mock.calls.map((c: unknown[]) => c[0])
      expect(eqCalls).not.toContain('status')
    })

    it('filters by status when given', async () => {
      const { registerLeaveTools } = await import('./leave.js')
      const { supabase } = (await import('../supabaseClient.js')) as any
      const { server, getTool } = createFakeServer()
      registerLeaveTools(server)

      const builder = makeQueryBuilder({ data: [], error: null })
      supabase.from.mockReturnValue(builder)

      await getTool('list_leave_requests').handler({ org_id: ORG_ID, status: 'pending', limit: 50 })

      expect(builder.eq).toHaveBeenCalledWith('status', 'pending')
    })
  })

  describe('get_leave_balances', () => {
    it('defaults to the current calendar year when none is given', async () => {
      const { registerLeaveTools } = await import('./leave.js')
      const { supabase } = (await import('../supabaseClient.js')) as any
      const { server, getTool } = createFakeServer()
      registerLeaveTools(server)

      const builder = makeQueryBuilder({ data: [], error: null })
      supabase.from.mockReturnValue(builder)

      await getTool('get_leave_balances').handler({ org_id: ORG_ID })

      expect(builder.eq).toHaveBeenCalledWith('year', new Date().getFullYear())
    })

    it('uses an explicit year when given, instead of the current year', async () => {
      const { registerLeaveTools } = await import('./leave.js')
      const { supabase } = (await import('../supabaseClient.js')) as any
      const { server, getTool } = createFakeServer()
      registerLeaveTools(server)

      const builder = makeQueryBuilder({ data: [], error: null })
      supabase.from.mockReturnValue(builder)

      await getTool('get_leave_balances').handler({ org_id: ORG_ID, year: 2024 })

      expect(builder.eq).toHaveBeenCalledWith('year', 2024)
    })

    it('adds an employee_id filter only when one is given', async () => {
      const { registerLeaveTools } = await import('./leave.js')
      const { supabase } = (await import('../supabaseClient.js')) as any
      const { server, getTool } = createFakeServer()
      registerLeaveTools(server)

      const withoutFilter = makeQueryBuilder({ data: [], error: null })
      supabase.from.mockReturnValueOnce(withoutFilter)
      await getTool('get_leave_balances').handler({ org_id: ORG_ID })
      expect(withoutFilter.eq.mock.calls.map((c: unknown[]) => c[0])).not.toContain('employee_id')

      const withFilter = makeQueryBuilder({ data: [], error: null })
      supabase.from.mockReturnValueOnce(withFilter)
      await getTool('get_leave_balances').handler({ org_id: ORG_ID, employee_id: 'emp-1' })
      expect(withFilter.eq).toHaveBeenCalledWith('employee_id', 'emp-1')
    })
  })
})
