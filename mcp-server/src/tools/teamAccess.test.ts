import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createFakeServer, resultJson } from '../testSupport/fakeServer.js'

const assertOrgUsableMock = vi.fn()
const resolveEffectiveActorMock = vi.fn()
const queryMock = vi.fn()
const withActorClaimsMock = vi.fn(async (_actor: unknown, fn: (query: typeof queryMock) => unknown) => fn(queryMock))

vi.mock('../orgGuard.js', () => ({ assertOrgUsable: assertOrgUsableMock }))
// resolveEffectiveActor is mocked as a black box here — its own fallback
// -to-default / no-actor-available logic is unit-tested directly in
// actor.test.ts, not re-tested per tool file.
vi.mock('../actor.js', () => ({ resolveEffectiveActor: resolveEffectiveActorMock }))
vi.mock('../db.js', () => ({ withActorClaims: withActorClaimsMock }))

const ORG_ID = '85ab7ff3-454b-4ba0-858d-037551986556'
const ACTOR = { sub: 'u1', email: 'peter@peterpaullazan.com', org_id: ORG_ID, user_role: 'super_admin' }

describe('team-access tools', () => {
  beforeEach(() => {
    assertOrgUsableMock.mockReset().mockResolvedValue({ id: ORG_ID, name: 'The Launchpad Inc' })
    resolveEffectiveActorMock.mockReset().mockResolvedValue(ACTOR)
    queryMock.mockReset()
    withActorClaimsMock.mockClear()
  })

  it('registers all seven team-access tools', async () => {
    const { registerTeamAccessTools } = await import('./teamAccess.js')
    const { server, toolNames } = createFakeServer()
    registerTeamAccessTools(server)
    expect(toolNames().sort()).toEqual([
      'change_user_role',
      'deactivate_member',
      'get_team_member',
      'list_pending_invites',
      'list_team_members',
      'reactivate_member',
      'revoke_invite',
    ])
  })

  describe('list_team_members', () => {
    it('verifies the org, resolves the default actor, and calls get_team_members via the claims wrapper', async () => {
      const { registerTeamAccessTools } = await import('./teamAccess.js')
      const { server, getTool } = createFakeServer()
      registerTeamAccessTools(server)

      const rows = [{ user_id: 'u1', full_name: 'Peter', role_slug: 'super_admin' }]
      queryMock.mockResolvedValue({ rows })

      const result = await getTool('list_team_members').handler({ org_id: ORG_ID })

      expect(assertOrgUsableMock).toHaveBeenCalledWith(ORG_ID)
      expect(resolveEffectiveActorMock).toHaveBeenCalledWith(undefined)
      expect(queryMock).toHaveBeenCalledWith('SELECT * FROM get_team_members($1)', [ORG_ID])
      expect(resultJson(result)).toEqual(rows)
    })

    it('passes an explicit actor_email override straight through to resolveEffectiveActor', async () => {
      const { registerTeamAccessTools } = await import('./teamAccess.js')
      const { server, getTool } = createFakeServer()
      registerTeamAccessTools(server)
      queryMock.mockResolvedValue({ rows: [] })

      await getTool('list_team_members').handler({ org_id: 'other-org', actor_email: 'someone-else@example.com' })

      expect(resolveEffectiveActorMock).toHaveBeenCalledWith('someone-else@example.com')
    })

    it('surfaces a resolveEffectiveActor rejection (e.g. no actor configured) as a structured tool error', async () => {
      resolveEffectiveActorMock.mockRejectedValue(new Error('No actor email available — set MCP_HRIS_ACTOR_EMAIL...'))
      const { registerTeamAccessTools } = await import('./teamAccess.js')
      const { server, getTool } = createFakeServer()
      registerTeamAccessTools(server)

      const result = await getTool('list_team_members').handler({ org_id: ORG_ID })

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('No actor email available')
      expect(withActorClaimsMock).not.toHaveBeenCalled()
    })

    it('never resolves an actor or calls the RPC when the org itself is rejected', async () => {
      assertOrgUsableMock.mockRejectedValue(new Error('No organization found with id bad-id'))
      const { registerTeamAccessTools } = await import('./teamAccess.js')
      const { server, getTool } = createFakeServer()
      registerTeamAccessTools(server)

      const result = await getTool('list_team_members').handler({ org_id: 'bad-id' })

      expect(result.isError).toBe(true)
      expect(resolveEffectiveActorMock).not.toHaveBeenCalled()
      expect(withActorClaimsMock).not.toHaveBeenCalled()
    })
  })

  describe('list_pending_invites', () => {
    it('calls get_pending_invites via the claims wrapper', async () => {
      const { registerTeamAccessTools } = await import('./teamAccess.js')
      const { server, getTool } = createFakeServer()
      registerTeamAccessTools(server)
      const rows = [{ id: 'inv-1', email: 'new@example.com' }]
      queryMock.mockResolvedValue({ rows })

      const result = await getTool('list_pending_invites').handler({ org_id: ORG_ID })

      expect(queryMock).toHaveBeenCalledWith('SELECT * FROM get_pending_invites($1)', [ORG_ID])
      expect(resultJson(result)).toEqual(rows)
    })
  })

  describe('get_team_member', () => {
    it('finds the matching member from the full roster by user_id', async () => {
      const { registerTeamAccessTools } = await import('./teamAccess.js')
      const { server, getTool } = createFakeServer()
      registerTeamAccessTools(server)
      const target = { user_id: 'u2', full_name: 'Fear Cleevan', role_slug: 'super_admin' }
      queryMock.mockResolvedValue({ rows: [{ user_id: 'u1', full_name: 'Peter' }, target] })

      const result = await getTool('get_team_member').handler({ org_id: ORG_ID, user_id: 'u2' })

      expect(resultJson(result)).toEqual(target)
    })

    it('returns a structured error (not a crash) when the user_id is not on the roster', async () => {
      const { registerTeamAccessTools } = await import('./teamAccess.js')
      const { server, getTool } = createFakeServer()
      registerTeamAccessTools(server)
      queryMock.mockResolvedValue({ rows: [{ user_id: 'u1', full_name: 'Peter' }] })

      const result = await getTool('get_team_member').handler({ org_id: ORG_ID, user_id: 'does-not-exist' })

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('No team member with user_id does-not-exist')
    })
  })

  describe('deactivate_member', () => {
    it('refuses without confirm and never touches the RPC or resolves an actor', async () => {
      const { registerTeamAccessTools } = await import('./teamAccess.js')
      const { server, getTool } = createFakeServer()
      registerTeamAccessTools(server)

      const result = await getTool('deactivate_member').handler({ org_id: ORG_ID, user_id: 'u2', confirm: false })

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('Re-call with confirm: true')
      expect(resolveEffectiveActorMock).not.toHaveBeenCalled()
      expect(withActorClaimsMock).not.toHaveBeenCalled()
    })

    it('calls deactivate_member($1) with the target user_id when confirmed', async () => {
      const { registerTeamAccessTools } = await import('./teamAccess.js')
      const { server, getTool } = createFakeServer()
      registerTeamAccessTools(server)
      queryMock.mockResolvedValue({})

      const result = await getTool('deactivate_member').handler({ org_id: ORG_ID, user_id: 'u2', confirm: true })

      expect(assertOrgUsableMock).toHaveBeenCalledWith(ORG_ID)
      expect(queryMock).toHaveBeenCalledWith('SELECT deactivate_member($1)', ['u2'])
      expect(resultJson(result)).toEqual({ org_id: ORG_ID, user_id: 'u2', deactivated: true })
    })

    it('still verifies the org even when confirm is missing (fails fast on a bad org before the confirm gate)', async () => {
      assertOrgUsableMock.mockRejectedValue(new Error('No organization found with id bad-org'))
      const { registerTeamAccessTools } = await import('./teamAccess.js')
      const { server, getTool } = createFakeServer()
      registerTeamAccessTools(server)

      const result = await getTool('deactivate_member').handler({ org_id: 'bad-org', user_id: 'u2', confirm: false })

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('No organization found')
    })
  })

  describe('reactivate_member', () => {
    it('is not gated by confirm — calls reactivate_member($1) directly', async () => {
      const { registerTeamAccessTools } = await import('./teamAccess.js')
      const { server, getTool } = createFakeServer()
      registerTeamAccessTools(server)
      queryMock.mockResolvedValue({})

      const result = await getTool('reactivate_member').handler({ org_id: ORG_ID, user_id: 'u2' })

      expect(queryMock).toHaveBeenCalledWith('SELECT reactivate_member($1)', ['u2'])
      expect(resultJson(result)).toEqual({ org_id: ORG_ID, user_id: 'u2', reactivated: true })
    })
  })

  describe('change_user_role', () => {
    const roster = [
      { user_id: 'peter', role_slug: 'super_admin', is_active: true },
      { user_id: 'u2', role_slug: 'super_admin', is_active: true },
      { user_id: 'u3', role_slug: 'hr_staff', is_active: true },
    ]

    it('refuses without confirm and never calls the change_user_role RPC (the guard check itself still fetches the roster, which is correct — it must run before confirm, not after)', async () => {
      const { registerTeamAccessTools } = await import('./teamAccess.js')
      const { server, getTool } = createFakeServer()
      registerTeamAccessTools(server)
      queryMock.mockImplementation(async (sql: string) => (sql.includes('get_team_members') ? { rows: roster } : {}))

      const result = await getTool('change_user_role').handler({
        org_id: ORG_ID,
        user_id: 'u3',
        new_role_slug: 'hr_manager',
        confirm: false,
      })

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('Re-call with confirm: true')
      const changeCalls = queryMock.mock.calls.filter((c) => c[0] === 'SELECT change_user_role($1, $2)')
      expect(changeCalls).toHaveLength(0)
    })

    it('changes the role when confirmed and the target is not the last super_admin', async () => {
      const { registerTeamAccessTools } = await import('./teamAccess.js')
      const { server, getTool } = createFakeServer()
      registerTeamAccessTools(server)
      queryMock.mockImplementation(async (sql: string) => (sql.includes('get_team_members') ? { rows: roster } : {}))

      const result = await getTool('change_user_role').handler({
        org_id: ORG_ID,
        user_id: 'u3',
        new_role_slug: 'hr_manager',
        confirm: true,
      })

      expect(queryMock).toHaveBeenCalledWith('SELECT change_user_role($1, $2)', ['u3', 'hr_manager'])
      expect(resultJson(result)).toEqual({ org_id: ORG_ID, user_id: 'u3', new_role_slug: 'hr_manager', changed: true })
    })

    // This is the one guard the underlying DB RPC does NOT have (unlike
    // deactivate_member, which the live QA session confirmed refuses this
    // case server-side) — the whole reason this tool exists on top of a
    // thin RPC passthrough. Must refuse even WITH confirm: true, since it's
    // not a "are you sure" gate, it's a correctness guard.
    it('refuses to demote the last active super_admin even with confirm: true', async () => {
      const { registerTeamAccessTools } = await import('./teamAccess.js')
      const { server, getTool } = createFakeServer()
      registerTeamAccessTools(server)
      // Only 'peter' is an active super_admin in this roster.
      const soleSuperAdminRoster = [
        { user_id: 'peter', role_slug: 'super_admin', is_active: true },
        { user_id: 'u3', role_slug: 'hr_staff', is_active: true },
      ]
      queryMock.mockImplementation(async (sql: string) =>
        sql.includes('get_team_members') ? { rows: soleSuperAdminRoster } : {},
      )

      const result = await getTool('change_user_role').handler({
        org_id: ORG_ID,
        user_id: 'peter',
        new_role_slug: 'hr_manager',
        confirm: true,
      })

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('no active super_admin')
      const changeCalls = queryMock.mock.calls.filter((c) => c[0] === 'SELECT change_user_role($1, $2)')
      expect(changeCalls).toHaveLength(0)
    })

    it('allows demoting a super_admin when another active super_admin remains', async () => {
      const { registerTeamAccessTools } = await import('./teamAccess.js')
      const { server, getTool } = createFakeServer()
      registerTeamAccessTools(server)
      queryMock.mockImplementation(async (sql: string) => (sql.includes('get_team_members') ? { rows: roster } : {}))

      const result = await getTool('change_user_role').handler({
        org_id: ORG_ID,
        user_id: 'u2', // also super_admin, but 'peter' remains as another active one
        new_role_slug: 'hr_staff',
        confirm: true,
      })

      expect(result.isError ?? false).toBe(false)
      expect(queryMock).toHaveBeenCalledWith('SELECT change_user_role($1, $2)', ['u2', 'hr_staff'])
    })

    it('does not treat an inactive super_admin as coverage for the guard', async () => {
      const { registerTeamAccessTools } = await import('./teamAccess.js')
      const { server, getTool } = createFakeServer()
      registerTeamAccessTools(server)
      const rosterWithInactiveCover = [
        { user_id: 'peter', role_slug: 'super_admin', is_active: true },
        { user_id: 'inactive-admin', role_slug: 'super_admin', is_active: false },
      ]
      queryMock.mockImplementation(async (sql: string) =>
        sql.includes('get_team_members') ? { rows: rosterWithInactiveCover } : {},
      )

      const result = await getTool('change_user_role').handler({
        org_id: ORG_ID,
        user_id: 'peter',
        new_role_slug: 'hr_staff',
        confirm: true,
      })

      // 'inactive-admin' is super_admin but not active, so it shouldn't
      // count as coverage — demoting 'peter' would still strip the org's
      // only *active* super_admin.
      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('no active super_admin')
    })

    it('does not guard a role change that keeps the target as super_admin (promotion/no-op)', async () => {
      const { registerTeamAccessTools } = await import('./teamAccess.js')
      const { server, getTool } = createFakeServer()
      registerTeamAccessTools(server)
      const soleSuperAdminRoster = [{ user_id: 'peter', role_slug: 'super_admin', is_active: true }]
      queryMock.mockImplementation(async (sql: string) =>
        sql.includes('get_team_members') ? { rows: soleSuperAdminRoster } : {},
      )

      const result = await getTool('change_user_role').handler({
        org_id: ORG_ID,
        user_id: 'peter',
        new_role_slug: 'super_admin',
        confirm: true,
      })

      expect(result.isError ?? false).toBe(false)
    })
  })

  describe('revoke_invite', () => {
    it('refuses without confirm', async () => {
      const { registerTeamAccessTools } = await import('./teamAccess.js')
      const { server, getTool } = createFakeServer()
      registerTeamAccessTools(server)

      const result = await getTool('revoke_invite').handler({ org_id: ORG_ID, invite_id: 'inv-1', confirm: false })

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('Re-call with confirm: true')
      expect(withActorClaimsMock).not.toHaveBeenCalled()
    })

    it('calls revoke_invite($1) when confirmed', async () => {
      const { registerTeamAccessTools } = await import('./teamAccess.js')
      const { server, getTool } = createFakeServer()
      registerTeamAccessTools(server)
      queryMock.mockResolvedValue({})

      const result = await getTool('revoke_invite').handler({ org_id: ORG_ID, invite_id: 'inv-1', confirm: true })

      expect(queryMock).toHaveBeenCalledWith('SELECT revoke_invite($1)', ['inv-1'])
      expect(resultJson(result)).toEqual({ org_id: ORG_ID, invite_id: 'inv-1', revoked: true })
    })
  })
})
