import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createFakeServer, resultJson } from '../testSupport/fakeServer.js'
import { makeQueryBuilder } from '../testSupport/supabaseMock.js'

const assertOrgUsableMock = vi.fn()
vi.mock('../orgGuard.js', () => ({ assertOrgUsable: assertOrgUsableMock }))
vi.mock('../supabaseClient.js', () => ({ supabase: { from: vi.fn() } }))

const ORG_ID = '85ab7ff3-454b-4ba0-858d-037551986556'

describe('payroll tools', () => {
  beforeEach(async () => {
    assertOrgUsableMock.mockReset().mockResolvedValue({ id: ORG_ID, name: 'The Launchpad Inc' })
    const { supabase } = (await import('../supabaseClient.js')) as any
    supabase.from.mockReset()
  })

  it('registers both payroll tools', async () => {
    const { registerPayrollTools } = await import('./payroll.js')
    const { server, toolNames } = createFakeServer()
    registerPayrollTools(server)
    expect(toolNames().sort()).toEqual(['list_payroll_disputes', 'list_payroll_runs'])
  })

  describe('list_payroll_runs', () => {
    it('verifies the org and returns runs with period details', async () => {
      const { registerPayrollTools } = await import('./payroll.js')
      const { supabase } = (await import('../supabaseClient.js')) as any
      const { server, getTool } = createFakeServer()
      registerPayrollTools(server)

      const rows = [{ id: 'run-1', status: 'computed' }]
      supabase.from.mockReturnValue(makeQueryBuilder({ data: rows, error: null }))

      const result = await getTool('list_payroll_runs').handler({ org_id: ORG_ID })

      expect(assertOrgUsableMock).toHaveBeenCalledWith(ORG_ID)
      expect(resultJson(result)).toEqual(rows)
    })
  })

  describe('list_payroll_disputes', () => {
    it('does not filter by status when none is given', async () => {
      const { registerPayrollTools } = await import('./payroll.js')
      const { supabase } = (await import('../supabaseClient.js')) as any
      const { server, getTool } = createFakeServer()
      registerPayrollTools(server)

      const builder = makeQueryBuilder({ data: [], error: null })
      supabase.from.mockReturnValue(builder)

      await getTool('list_payroll_disputes').handler({ org_id: ORG_ID })

      const eqCalls = builder.eq.mock.calls.map((c: unknown[]) => c[0])
      expect(eqCalls).not.toContain('status')
      expect(builder.in).not.toHaveBeenCalled()
    })

    it('filters by a plain .eq() for statuses other than under_review', async () => {
      const { registerPayrollTools } = await import('./payroll.js')
      const { supabase } = (await import('../supabaseClient.js')) as any
      const { server, getTool } = createFakeServer()
      registerPayrollTools(server)

      const builder = makeQueryBuilder({ data: [], error: null })
      supabase.from.mockReturnValue(builder)

      await getTool('list_payroll_disputes').handler({ org_id: ORG_ID, status: 'resolved' })

      expect(builder.eq).toHaveBeenCalledWith('status', 'resolved')
      expect(builder.in).not.toHaveBeenCalled()
    })

    // payroll_disputes.status is plain text, not a DB enum — the real app
    // normalizes a legacy 'review' literal to 'under_review' client-side.
    // This is the one behavior in the whole read-tool set that isn't a
    // straight passthrough, so it's worth pinning down explicitly.
    it('matches both "under_review" and the legacy "review" literal when filtering by under_review', async () => {
      const { registerPayrollTools } = await import('./payroll.js')
      const { supabase } = (await import('../supabaseClient.js')) as any
      const { server, getTool } = createFakeServer()
      registerPayrollTools(server)

      const builder = makeQueryBuilder({ data: [], error: null })
      supabase.from.mockReturnValue(builder)

      await getTool('list_payroll_disputes').handler({ org_id: ORG_ID, status: 'under_review' })

      expect(builder.in).toHaveBeenCalledWith('status', ['under_review', 'review'])
      const eqCalls = builder.eq.mock.calls.map((c: unknown[]) => c[0])
      expect(eqCalls).not.toContain('status')
    })

    it('surfaces a Supabase error as a structured tool error', async () => {
      const { registerPayrollTools } = await import('./payroll.js')
      const { supabase } = (await import('../supabaseClient.js')) as any
      const { server, getTool } = createFakeServer()
      registerPayrollTools(server)

      supabase.from.mockReturnValue(makeQueryBuilder({ data: null, error: { message: 'timeout' } }))

      const result = await getTool('list_payroll_disputes').handler({ org_id: ORG_ID })

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('timeout')
    })
  })
})
