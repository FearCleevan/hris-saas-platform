import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createFakeServer, resultJson } from '../testSupport/fakeServer.js'
import { makeQueryBuilder, type MockQueryBuilder } from '../testSupport/supabaseMock.js'

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

describe('leave tools', () => {
  beforeEach(async () => {
    assertOrgUsableMock.mockReset().mockResolvedValue({ id: ORG_ID, name: 'The Launchpad Inc' })
    resolveEffectiveActorMock.mockReset().mockResolvedValue(ACTOR)
    queryMock.mockReset()
    withActorClaimsMock.mockClear()
    const { supabase } = (await import('../supabaseClient.js')) as any
    supabase.from.mockReset()
  })

  it('registers all seven leave tools', async () => {
    const { registerLeaveTools } = await import('./leave.js')
    const { server, toolNames } = createFakeServer()
    registerLeaveTools(server)
    expect(toolNames().sort()).toEqual([
      'apply_leave',
      'approve_leave_request',
      'get_leave_balances',
      'list_leave_requests',
      'list_leave_types',
      'reject_leave_request',
      'seed_default_leave_types',
    ])
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

  const leaveArgs = {
    org_id: ORG_ID,
    employee_id: 'emp-1',
    leave_type_id: 'lt-1',
    start_date: '2026-09-01',
    end_date: '2026-09-03',
    total_days: 3,
    reason: 'QA test leave',
  }

  describe('apply_leave', () => {
    function dispatcher(leaveRequests: MockQueryBuilder, leaveBalances: MockQueryBuilder) {
      return vi.fn((table: string) => {
        if (table === 'leave_requests') return leaveRequests
        if (table === 'leave_balances') return leaveBalances
        throw new Error(`unexpected table ${table}`)
      })
    }

    it('inserts a pending request and creates a new balance row when none exists yet', async () => {
      const { registerLeaveTools } = await import('./leave.js')
      const { supabase } = (await import('../supabaseClient.js')) as any
      const { server, getTool } = createFakeServer()
      registerLeaveTools(server)

      const leaveRequests = makeQueryBuilder({ data: { id: 'req-1' }, error: null })
      const leaveBalances = makeQueryBuilder({ data: null, error: null }) // no existing balance row
      supabase.from = dispatcher(leaveRequests, leaveBalances)

      const result = await getTool('apply_leave').handler(leaveArgs)

      expect(assertOrgUsableMock).toHaveBeenCalledWith(ORG_ID)
      const insertArg = leaveRequests.insert.mock.calls[0][0]
      expect(insertArg).toMatchObject({ employee_id: 'emp-1', organization_id: ORG_ID, status: 'pending', total_days: 3 })
      expect(leaveBalances.insert).toHaveBeenCalledWith(
        expect.objectContaining({ employee_id: 'emp-1', leave_type_id: 'lt-1', year: 2026, pending_days: 3 }),
      )
      expect(leaveBalances.update).not.toHaveBeenCalled()
      expect(resultJson(result)).toMatchObject({ request_id: 'req-1', status: 'pending' })
    })

    it('bumps an existing balance row\'s pending_days instead of inserting a new one', async () => {
      const { registerLeaveTools } = await import('./leave.js')
      const { supabase } = (await import('../supabaseClient.js')) as any
      const { server, getTool } = createFakeServer()
      registerLeaveTools(server)

      const leaveRequests = makeQueryBuilder({ data: { id: 'req-1' }, error: null })
      const leaveBalances = makeQueryBuilder({ data: { id: 'bal-1', pending_days: 2 }, error: null })
      supabase.from = dispatcher(leaveRequests, leaveBalances)

      await getTool('apply_leave').handler(leaveArgs)

      expect(leaveBalances.update).toHaveBeenCalledWith({ pending_days: 5 }) // 2 existing + 3 new
      expect(leaveBalances.eq).toHaveBeenCalledWith('id', 'bal-1')
      expect(leaveBalances.insert).not.toHaveBeenCalled()
    })

    // The compensating rollback: if the balance write fails after the
    // request insert already succeeded, the just-inserted request must be
    // deleted rather than left as an orphaned "ghost" pending row. Directly
    // mirrors services/leaves.ts's applyLeave().
    it('deletes the just-inserted request if the balance write fails', async () => {
      const { registerLeaveTools } = await import('./leave.js')
      const { supabase } = (await import('../supabaseClient.js')) as any
      const { server, getTool } = createFakeServer()
      registerLeaveTools(server)

      const leaveRequests = makeQueryBuilder({ data: { id: 'req-1' }, error: null })
      const leaveBalances = makeQueryBuilder({ data: null, error: { message: 'balance fetch failed' } })
      supabase.from = dispatcher(leaveRequests, leaveBalances)

      const result = await getTool('apply_leave').handler(leaveArgs)

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('balance fetch failed')
      expect(leaveRequests.delete).toHaveBeenCalled()
      expect(leaveRequests.eq).toHaveBeenCalledWith('id', 'req-1')
    })

    it('surfaces the request insert error directly, without attempting a balance write at all', async () => {
      const { registerLeaveTools } = await import('./leave.js')
      const { supabase } = (await import('../supabaseClient.js')) as any
      const { server, getTool } = createFakeServer()
      registerLeaveTools(server)

      const leaveRequests = makeQueryBuilder({ data: null, error: { message: 'insert violates constraint' } })
      const leaveBalances = makeQueryBuilder({ data: null, error: null })
      supabase.from = dispatcher(leaveRequests, leaveBalances)

      const result = await getTool('apply_leave').handler(leaveArgs)

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('insert violates constraint')
      expect(leaveBalances.select).not.toHaveBeenCalled()
    })
  })

  describe('approve_leave_request', () => {
    it('verifies the org, resolves the actor, and calls approve_leave_request($1, $2) via the claims wrapper', async () => {
      const { registerLeaveTools } = await import('./leave.js')
      const { server, getTool } = createFakeServer()
      registerLeaveTools(server)
      queryMock.mockResolvedValue({})

      const result = await getTool('approve_leave_request').handler({ org_id: ORG_ID, request_id: 'req-1', remarks: 'ok' })

      expect(assertOrgUsableMock).toHaveBeenCalledWith(ORG_ID)
      expect(resolveEffectiveActorMock).toHaveBeenCalledWith(undefined)
      expect(queryMock).toHaveBeenCalledWith('SELECT approve_leave_request($1, $2)', ['req-1', 'ok'])
      expect(resultJson(result)).toEqual({ org_id: ORG_ID, request_id: 'req-1', status: 'approved' })
    })

    it('passes null remarks when none is given', async () => {
      const { registerLeaveTools } = await import('./leave.js')
      const { server, getTool } = createFakeServer()
      registerLeaveTools(server)
      queryMock.mockResolvedValue({})

      await getTool('approve_leave_request').handler({ org_id: ORG_ID, request_id: 'req-1' })

      expect(queryMock).toHaveBeenCalledWith('SELECT approve_leave_request($1, $2)', ['req-1', null])
    })
  })

  describe('reject_leave_request', () => {
    it('calls reject_leave_request($1, $2) via the claims wrapper', async () => {
      const { registerLeaveTools } = await import('./leave.js')
      const { server, getTool } = createFakeServer()
      registerLeaveTools(server)
      queryMock.mockResolvedValue({})

      const result = await getTool('reject_leave_request').handler({ org_id: ORG_ID, request_id: 'req-1', remarks: 'insufficient balance' })

      expect(queryMock).toHaveBeenCalledWith('SELECT reject_leave_request($1, $2)', ['req-1', 'insufficient balance'])
      expect(resultJson(result)).toEqual({ org_id: ORG_ID, request_id: 'req-1', status: 'rejected' })
    })
  })

  describe('seed_default_leave_types', () => {
    it('refuses without confirm', async () => {
      const { registerLeaveTools } = await import('./leave.js')
      const { supabase } = (await import('../supabaseClient.js')) as any
      const { server, getTool } = createFakeServer()
      registerLeaveTools(server)
      supabase.from.mockReturnValue(makeQueryBuilder({ count: 0, error: null }))

      const result = await getTool('seed_default_leave_types').handler({ org_id: ORG_ID, confirm: false })

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('Re-call with confirm: true')
    })

    it('refuses outright — even with confirm: true — if the org already has any leave types', async () => {
      const { registerLeaveTools } = await import('./leave.js')
      const { supabase } = (await import('../supabaseClient.js')) as any
      const { server, getTool } = createFakeServer()
      registerLeaveTools(server)
      const builder = makeQueryBuilder({ count: 3, error: null })
      supabase.from.mockReturnValue(builder)

      const result = await getTool('seed_default_leave_types').handler({ org_id: ORG_ID, confirm: true })

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('already has 3 leave type')
      expect(builder.insert).not.toHaveBeenCalled()
    })

    it('seeds all 9 standard PH leave types when confirmed and the org has none', async () => {
      const { registerLeaveTools } = await import('./leave.js')
      const { supabase } = (await import('../supabaseClient.js')) as any
      const { server, getTool } = createFakeServer()
      registerLeaveTools(server)
      const seeded = Array.from({ length: 9 }, (_, i) => ({ id: `lt-${i}`, name: `Type ${i}`, code: `T${i}` }))
      const builder = makeQueryBuilder({ count: 0, data: seeded, error: null })
      supabase.from.mockReturnValue(builder)

      const result = await getTool('seed_default_leave_types').handler({ org_id: ORG_ID, confirm: true })

      const insertArg = builder.insert.mock.calls[0][0] as { organization_id: string; code: string }[]
      expect(insertArg).toHaveLength(9)
      expect(insertArg.every((t) => t.organization_id === ORG_ID)).toBe(true)
      expect(insertArg.map((t) => t.code).sort()).toEqual(['BL', 'EL', 'ML', 'PL', 'SIL', 'SL', 'SPL', 'UL', 'VL'])
      expect(resultJson(result)).toMatchObject({ org_id: ORG_ID, seeded })
    })
  })
})
