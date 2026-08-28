import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createFakeServer, resultJson } from '../testSupport/fakeServer.js'
import { makeQueryBuilder } from '../testSupport/supabaseMock.js'

const assertOrgUsableMock = vi.fn()
vi.mock('../orgGuard.js', () => ({ assertOrgUsable: assertOrgUsableMock }))
vi.mock('../supabaseClient.js', () => ({ supabase: { from: vi.fn() } }))

const ORG_ID = '85ab7ff3-454b-4ba0-858d-037551986556'

describe('employee tools', () => {
  beforeEach(async () => {
    assertOrgUsableMock.mockReset().mockResolvedValue({ id: ORG_ID, name: 'The Launchpad Inc' })
    const { supabase } = (await import('../supabaseClient.js')) as any
    supabase.from.mockReset()
  })

  it('registers both employee tools', async () => {
    const { registerEmployeeTools } = await import('./employees.js')
    const { server, toolNames } = createFakeServer()
    registerEmployeeTools(server)
    expect(toolNames().sort()).toEqual(['get_employee', 'search_employees'])
  })

  describe('search_employees', () => {
    it('verifies the org and returns matching rows', async () => {
      const { registerEmployeeTools } = await import('./employees.js')
      const { supabase } = (await import('../supabaseClient.js')) as any
      const { server, getTool } = createFakeServer()
      registerEmployeeTools(server)

      const rows = [{ id: 'e1', first_name: 'Test', last_name: 'test', is_active: true }]
      const builder = makeQueryBuilder({ data: rows, error: null })
      supabase.from.mockReturnValue(builder)

      const result = await getTool('search_employees').handler({ org_id: ORG_ID, active_only: true, limit: 50 })

      expect(assertOrgUsableMock).toHaveBeenCalledWith(ORG_ID)
      expect(supabase.from).toHaveBeenCalledWith('employees')
      expect(builder.eq).toHaveBeenCalledWith('organization_id', ORG_ID)
      expect(resultJson(result)).toEqual(rows)
    })

    it('adds an is_active filter only when active_only is true', async () => {
      const { registerEmployeeTools } = await import('./employees.js')
      const { supabase } = (await import('../supabaseClient.js')) as any
      const { server, getTool } = createFakeServer()
      registerEmployeeTools(server)

      const builder = makeQueryBuilder({ data: [], error: null })
      supabase.from.mockReturnValue(builder)

      await getTool('search_employees').handler({ org_id: ORG_ID, active_only: false, limit: 50 })

      const eqCalls = builder.eq.mock.calls.map((c: unknown[]) => c[0])
      expect(eqCalls).not.toContain('is_active')
    })

    it('strips filter-breaking characters from a search query before building the .or() clause', async () => {
      const { registerEmployeeTools } = await import('./employees.js')
      const { supabase } = (await import('../supabaseClient.js')) as any
      const { server, getTool } = createFakeServer()
      registerEmployeeTools(server)

      const builder = makeQueryBuilder({ data: [], error: null })
      supabase.from.mockReturnValue(builder)

      await getTool('search_employees').handler({ org_id: ORG_ID, active_only: true, query: 'Smith(),Jones', limit: 50 })

      const orArg = builder.or.mock.calls[0][0]
      expect(orArg).not.toContain('(')
      expect(orArg).not.toContain(')')
      // The literal comma inside the search term is gone, but the filter's
      // own comma-separated structure (three conditions) is intact.
      expect(orArg.split(',')).toHaveLength(3)
    })

    it('surfaces a Supabase error as a structured tool error', async () => {
      const { registerEmployeeTools } = await import('./employees.js')
      const { supabase } = (await import('../supabaseClient.js')) as any
      const { server, getTool } = createFakeServer()
      registerEmployeeTools(server)

      supabase.from.mockReturnValue(makeQueryBuilder({ data: null, error: { message: 'connection reset' } }))

      const result = await getTool('search_employees').handler({ org_id: ORG_ID, active_only: true, limit: 50 })

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('connection reset')
    })
  })

  describe('get_employee', () => {
    it('returns the employee when found', async () => {
      const { registerEmployeeTools } = await import('./employees.js')
      const { supabase } = (await import('../supabaseClient.js')) as any
      const { server, getTool } = createFakeServer()
      registerEmployeeTools(server)

      const employee = { id: 'e1', first_name: 'Test' }
      supabase.from.mockReturnValue(makeQueryBuilder({ data: employee, error: null }))

      const result = await getTool('get_employee').handler({ org_id: ORG_ID, employee_id: 'e1' })

      expect(resultJson(result)).toEqual(employee)
    })

    it('returns a clear not-found error instead of an empty/null result', async () => {
      const { registerEmployeeTools } = await import('./employees.js')
      const { supabase } = (await import('../supabaseClient.js')) as any
      const { server, getTool } = createFakeServer()
      registerEmployeeTools(server)

      supabase.from.mockReturnValue(makeQueryBuilder({ data: null, error: null }))

      const result = await getTool('get_employee').handler({ org_id: ORG_ID, employee_id: 'missing' })

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('No employee with id missing found in org')
    })
  })
})
