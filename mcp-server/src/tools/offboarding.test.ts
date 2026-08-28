import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createFakeServer, resultJson } from '../testSupport/fakeServer.js'
import { makeQueryBuilder } from '../testSupport/supabaseMock.js'

const assertOrgUsableMock = vi.fn()
const resolveEffectiveActorMock = vi.fn()
const queryMock = vi.fn()
const withActorClaimsMock = vi.fn(async (_actor: unknown, fn: (query: typeof queryMock) => unknown) => fn(queryMock))

vi.mock('../orgGuard.js', () => ({ assertOrgUsable: assertOrgUsableMock }))
vi.mock('../supabaseClient.js', () => ({ supabase: { from: vi.fn() } }))
vi.mock('../actor.js', () => ({ resolveEffectiveActor: resolveEffectiveActorMock }))
vi.mock('../db.js', () => ({ withActorClaims: withActorClaimsMock }))

const ORG_ID = '85ab7ff3-454b-4ba0-858d-037551986556'
const ACTOR = { sub: 'u1', email: 'peter@peterpaullazan.com', org_id: ORG_ID, user_role: 'super_admin' }

describe('offboarding tools', () => {
  beforeEach(async () => {
    assertOrgUsableMock.mockReset().mockResolvedValue({ id: ORG_ID, name: 'The Launchpad Inc' })
    resolveEffectiveActorMock.mockReset().mockResolvedValue(ACTOR)
    queryMock.mockReset()
    withActorClaimsMock.mockClear()
    const { supabase } = (await import('../supabaseClient.js')) as any
    supabase.from.mockReset()
  })

  it('registers all five offboarding tools', async () => {
    const { registerOffboardingTools } = await import('./offboarding.js')
    const { server, toolNames } = createFakeServer()
    registerOffboardingTools(server)
    expect(toolNames().sort()).toEqual([
      'complete_offboarding',
      'get_offboarding_detail',
      'list_offboarding_records',
      'update_clearance_item',
      'update_final_pay_status',
    ])
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

  describe('update_clearance_item', () => {
    // Sets up the three sequential .from() calls this tool makes, in order:
    // (1) update the item itself, (2) select all sibling items to recompute
    // the rollup, (3) update the parent offboarding_records rollup.
    function mockSequence(supabase: any, updateResult: any, siblingsResult: any, rollupResult: any) {
      const updateBuilder = makeQueryBuilder(updateResult)
      const siblingsBuilder = makeQueryBuilder(siblingsResult)
      const rollupBuilder = makeQueryBuilder(rollupResult)
      supabase.from
        .mockImplementationOnce(() => updateBuilder)
        .mockImplementationOnce(() => siblingsBuilder)
        .mockImplementationOnce(() => rollupBuilder)
      return { updateBuilder, siblingsBuilder, rollupBuilder }
    }

    it('sets cleared_at/cleared_by (from the resolved actor) only when status is "cleared"', async () => {
      const { registerOffboardingTools } = await import('./offboarding.js')
      const { supabase } = (await import('../supabaseClient.js')) as any
      const { server, getTool } = createFakeServer()
      registerOffboardingTools(server)

      const { updateBuilder } = mockSequence(
        supabase,
        { data: { id: 'cp-1', offboarding_id: 'off-1', status: 'cleared' }, error: null },
        { data: [{ status: 'cleared' }], error: null },
        { data: null, error: null },
      )

      await getTool('update_clearance_item').handler({ org_id: ORG_ID, clearance_progress_id: 'cp-1', status: 'cleared' })

      const updateArg = updateBuilder.update.mock.calls[0][0]
      expect(updateArg.cleared_by).toBe('u1')
      expect(updateArg.cleared_at).not.toBeNull()
    })

    it('leaves cleared_at/cleared_by null when status is "pending" or "held"', async () => {
      const { registerOffboardingTools } = await import('./offboarding.js')
      const { supabase } = (await import('../supabaseClient.js')) as any
      const { server, getTool } = createFakeServer()
      registerOffboardingTools(server)

      const { updateBuilder } = mockSequence(
        supabase,
        { data: { id: 'cp-1', offboarding_id: 'off-1', status: 'held' }, error: null },
        { data: [{ status: 'held' }], error: null },
        { data: null, error: null },
      )

      await getTool('update_clearance_item').handler({ org_id: ORG_ID, clearance_progress_id: 'cp-1', status: 'held' })

      const updateArg = updateBuilder.update.mock.calls[0][0]
      expect(updateArg.cleared_by).toBeNull()
      expect(updateArg.cleared_at).toBeNull()
    })

    it('recomputes the rollup as "held" when any sibling item is held', async () => {
      const { registerOffboardingTools } = await import('./offboarding.js')
      const { supabase } = (await import('../supabaseClient.js')) as any
      const { server, getTool } = createFakeServer()
      registerOffboardingTools(server)

      const { rollupBuilder } = mockSequence(
        supabase,
        { data: { id: 'cp-1', offboarding_id: 'off-1', status: 'cleared' }, error: null },
        { data: [{ status: 'cleared' }, { status: 'held' }], error: null },
        { data: null, error: null },
      )

      const result = await getTool('update_clearance_item').handler({ org_id: ORG_ID, clearance_progress_id: 'cp-1', status: 'cleared' })

      expect(rollupBuilder.update).toHaveBeenCalledWith({ clearance_status: 'held' })
      expect(resultJson(result)).toMatchObject({ clearance_status_rollup: 'held' })
    })

    it('recomputes the rollup as "in_progress" when neither all cleared nor any held', async () => {
      const { registerOffboardingTools } = await import('./offboarding.js')
      const { supabase } = (await import('../supabaseClient.js')) as any
      const { server, getTool } = createFakeServer()
      registerOffboardingTools(server)

      mockSequence(
        supabase,
        { data: { id: 'cp-1', offboarding_id: 'off-1', status: 'cleared' }, error: null },
        { data: [{ status: 'cleared' }, { status: 'pending' }], error: null },
        { data: null, error: null },
      )

      const result = await getTool('update_clearance_item').handler({ org_id: ORG_ID, clearance_progress_id: 'cp-1', status: 'cleared' })

      expect(resultJson(result)).toMatchObject({ clearance_status_rollup: 'in_progress' })
    })

    // The core safety property this whole tool exists to preserve — see the
    // file's header comment in offboarding.ts.
    it('never calls the complete_offboarding RPC, even when the rollup becomes fully "cleared"', async () => {
      const { registerOffboardingTools } = await import('./offboarding.js')
      const { supabase } = (await import('../supabaseClient.js')) as any
      const { server, getTool } = createFakeServer()
      registerOffboardingTools(server)

      mockSequence(
        supabase,
        { data: { id: 'cp-1', offboarding_id: 'off-1', status: 'cleared' }, error: null },
        { data: [{ status: 'cleared' }], error: null },
        { data: null, error: null },
      )

      const result = await getTool('update_clearance_item').handler({ org_id: ORG_ID, clearance_progress_id: 'cp-1', status: 'cleared' })

      expect(resultJson(result)).toMatchObject({ clearance_status_rollup: 'cleared' })
      expect(result.content[0].text).toContain('NOT auto-completed')
      expect(withActorClaimsMock).not.toHaveBeenCalled()
      expect(queryMock).not.toHaveBeenCalled()
    })

    it('returns a not-found error when the clearance item id does not match anything in the org', async () => {
      const { registerOffboardingTools } = await import('./offboarding.js')
      const { supabase } = (await import('../supabaseClient.js')) as any
      const { server, getTool } = createFakeServer()
      registerOffboardingTools(server)

      supabase.from.mockReturnValueOnce(makeQueryBuilder({ data: null, error: null }))

      const result = await getTool('update_clearance_item').handler({ org_id: ORG_ID, clearance_progress_id: 'missing', status: 'cleared' })

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('No clearance item with id missing')
    })
  })

  describe('update_final_pay_status', () => {
    it('sets final_pay_date only when status is "released"', async () => {
      const { registerOffboardingTools } = await import('./offboarding.js')
      const { supabase } = (await import('../supabaseClient.js')) as any
      const { server, getTool } = createFakeServer()
      registerOffboardingTools(server)

      const builder = makeQueryBuilder({ data: { id: 'off-1', clearance_status: 'pending', final_pay_status: 'released' }, error: null })
      supabase.from.mockReturnValue(builder)

      await getTool('update_final_pay_status').handler({ org_id: ORG_ID, offboarding_id: 'off-1', status: 'released' })

      expect(builder.update.mock.calls[0][0]).toHaveProperty('final_pay_date')
    })

    it('does not set final_pay_date for a non-released status', async () => {
      const { registerOffboardingTools } = await import('./offboarding.js')
      const { supabase } = (await import('../supabaseClient.js')) as any
      const { server, getTool } = createFakeServer()
      registerOffboardingTools(server)

      const builder = makeQueryBuilder({ data: { id: 'off-1', clearance_status: 'pending', final_pay_status: 'computed' }, error: null })
      supabase.from.mockReturnValue(builder)

      await getTool('update_final_pay_status').handler({ org_id: ORG_ID, offboarding_id: 'off-1', status: 'computed' })

      expect(builder.update.mock.calls[0][0]).not.toHaveProperty('final_pay_date')
    })

    it('never calls any RPC — plain table write only, no auto-completion', async () => {
      const { registerOffboardingTools } = await import('./offboarding.js')
      const { supabase } = (await import('../supabaseClient.js')) as any
      const { server, getTool } = createFakeServer()
      registerOffboardingTools(server)

      supabase.from.mockReturnValue(
        makeQueryBuilder({ data: { id: 'off-1', clearance_status: 'cleared', final_pay_status: 'released' }, error: null }),
      )

      const result = await getTool('update_final_pay_status').handler({ org_id: ORG_ID, offboarding_id: 'off-1', status: 'released' })

      expect(result.content[0].text).toContain('NOT auto-completed')
      expect(withActorClaimsMock).not.toHaveBeenCalled()
    })
  })

  describe('complete_offboarding', () => {
    it('refuses without confirm and mentions employee termination explicitly', async () => {
      const { registerOffboardingTools } = await import('./offboarding.js')
      const { server, getTool } = createFakeServer()
      registerOffboardingTools(server)

      const result = await getTool('complete_offboarding').handler({ org_id: ORG_ID, offboarding_id: 'off-1', confirm: false })

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('TERMINATE')
      expect(result.content[0].text).toContain('Re-call with confirm: true')
      expect(resolveEffectiveActorMock).not.toHaveBeenCalled()
    })

    it('calls complete_offboarding($1) via the claims wrapper when confirmed', async () => {
      const { registerOffboardingTools } = await import('./offboarding.js')
      const { server, getTool } = createFakeServer()
      registerOffboardingTools(server)
      queryMock.mockResolvedValue({})

      const result = await getTool('complete_offboarding').handler({ org_id: ORG_ID, offboarding_id: 'off-1', confirm: true })

      expect(queryMock).toHaveBeenCalledWith('SELECT complete_offboarding($1)', ['off-1'])
      expect(resultJson(result)).toEqual({ org_id: ORG_ID, offboarding_id: 'off-1', completed: true })
    })
  })
})
