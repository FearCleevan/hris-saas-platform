import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createFakeServer, resultJson } from '../testSupport/fakeServer.js'
import { makeQueryBuilder } from '../testSupport/supabaseMock.js'

const assertOrgUsableMock = vi.fn()
vi.mock('../orgGuard.js', () => ({ assertOrgUsable: assertOrgUsableMock }))
vi.mock('../supabaseClient.js', () => ({ supabase: { from: vi.fn() } }))

const ORG_ID = '85ab7ff3-454b-4ba0-858d-037551986556'

describe('offboarding tools', () => {
  beforeEach(async () => {
    assertOrgUsableMock.mockReset().mockResolvedValue({ id: ORG_ID, name: 'The Launchpad Inc' })
    const { supabase } = (await import('../supabaseClient.js')) as any
    supabase.from.mockReset()
  })

  it('registers both offboarding tools', async () => {
    const { registerOffboardingTools } = await import('./offboarding.js')
    const { server, toolNames } = createFakeServer()
    registerOffboardingTools(server)
    expect(toolNames().sort()).toEqual(['get_offboarding_detail', 'list_offboarding_records'])
  })

  describe('list_offboarding_records', () => {
    it('verifies the org and returns the records', async () => {
      const { registerOffboardingTools } = await import('./offboarding.js')
      const { supabase } = (await import('../supabaseClient.js')) as any
      const { server, getTool } = createFakeServer()
      registerOffboardingTools(server)

      const rows = [{ id: 'off-1', clearance_status: 'cleared', final_pay_status: 'released' }]
      supabase.from.mockReturnValue(makeQueryBuilder({ data: rows, error: null }))

      const result = await getTool('list_offboarding_records').handler({ org_id: ORG_ID })

      expect(assertOrgUsableMock).toHaveBeenCalledWith(ORG_ID)
      expect(resultJson(result)).toEqual(rows)
    })
  })

  describe('get_offboarding_detail', () => {
    it('returns the record when found', async () => {
      const { registerOffboardingTools } = await import('./offboarding.js')
      const { supabase } = (await import('../supabaseClient.js')) as any
      const { server, getTool } = createFakeServer()
      registerOffboardingTools(server)

      const record = { id: 'off-1', clearance_status: 'pending' }
      const builder = makeQueryBuilder({ data: record, error: null })
      supabase.from.mockReturnValue(builder)

      const result = await getTool('get_offboarding_detail').handler({ org_id: ORG_ID, offboarding_id: 'off-1' })

      expect(builder.eq).toHaveBeenCalledWith('id', 'off-1')
      expect(resultJson(result)).toEqual(record)
    })

    it('returns a clear not-found error rather than an empty result', async () => {
      const { registerOffboardingTools } = await import('./offboarding.js')
      const { supabase } = (await import('../supabaseClient.js')) as any
      const { server, getTool } = createFakeServer()
      registerOffboardingTools(server)

      supabase.from.mockReturnValue(makeQueryBuilder({ data: null, error: null }))

      const result = await getTool('get_offboarding_detail').handler({ org_id: ORG_ID, offboarding_id: 'missing' })

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('No offboarding record with id missing')
    })
  })
})
