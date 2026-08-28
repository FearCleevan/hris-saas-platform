import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createFakeServer, resultJson } from '../testSupport/fakeServer.js'
import { makeQueryBuilder } from '../testSupport/supabaseMock.js'

const assertOrgUsableMock = vi.fn()
vi.mock('../orgGuard.js', () => ({ assertOrgUsable: assertOrgUsableMock }))
vi.mock('../supabaseClient.js', () => ({ supabase: { from: vi.fn() } }))

describe('get_org_context tool', () => {
  beforeEach(async () => {
    assertOrgUsableMock.mockReset()
    const { supabase } = (await import('../supabaseClient.js')) as any
    supabase.from.mockReset()
  })

  it('is registered with the expected name', async () => {
    const { registerOrgTools } = await import('./orgs.js')
    const { server, toolNames } = createFakeServer()
    registerOrgTools(server)
    expect(toolNames()).toEqual(['get_org_context'])
  })

  it('returns org details plus member/employee counts', async () => {
    const { registerOrgTools } = await import('./orgs.js')
    const { supabase } = (await import('../supabaseClient.js')) as any
    const { server, getTool } = createFakeServer()
    registerOrgTools(server)

    assertOrgUsableMock.mockResolvedValue({ id: 'org-a', name: 'The Launchpad Inc' })
    supabase.from.mockImplementation((table: string) => {
      if (table === 'user_roles') return makeQueryBuilder({ count: 3, error: null })
      if (table === 'employees') return makeQueryBuilder({ count: 12, error: null })
      throw new Error(`unexpected table ${table}`)
    })

    const result = await getTool('get_org_context').handler({ org_id: 'org-a' })

    expect(assertOrgUsableMock).toHaveBeenCalledWith('org-a')
    expect(resultJson(result)).toEqual({
      id: 'org-a',
      name: 'The Launchpad Inc',
      memberCount: 3,
      activeEmployeeCount: 12,
    })
  })

  it('defaults counts to 0 when Supabase returns a null count', async () => {
    const { registerOrgTools } = await import('./orgs.js')
    const { supabase } = (await import('../supabaseClient.js')) as any
    const { server, getTool } = createFakeServer()
    registerOrgTools(server)

    assertOrgUsableMock.mockResolvedValue({ id: 'org-a', name: 'Empty Org' })
    supabase.from.mockImplementation(() => makeQueryBuilder({ count: null, error: null }))

    const result = await getTool('get_org_context').handler({ org_id: 'org-a' })

    expect(resultJson(result)).toMatchObject({ memberCount: 0, activeEmployeeCount: 0 })
  })

  it('never queries counts when assertOrgUsable rejects (bad/unverified org id)', async () => {
    const { registerOrgTools } = await import('./orgs.js')
    const { supabase } = (await import('../supabaseClient.js')) as any
    const { server, getTool } = createFakeServer()
    registerOrgTools(server)

    assertOrgUsableMock.mockRejectedValue(new Error('No organization found with id bad-id'))

    const result = await getTool('get_org_context').handler({ org_id: 'bad-id' })

    expect(result.isError).toBe(true)
    expect(supabase.from).not.toHaveBeenCalled()
  })
})
