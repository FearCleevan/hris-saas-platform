import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createFakeServer, resultJson } from '../testSupport/fakeServer.js'

const assertOrgUsableMock = vi.fn()
const resolveActorMock = vi.fn()
const queryMock = vi.fn()
const withActorClaimsMock = vi.fn(async (_actor: unknown, fn: (query: typeof queryMock) => unknown) => fn(queryMock))

vi.mock('../orgGuard.js', () => ({ assertOrgUsable: assertOrgUsableMock }))
vi.mock('../actor.js', () => ({ resolveActor: resolveActorMock }))
vi.mock('../db.js', () => ({ withActorClaims: withActorClaimsMock }))

// MCP_HRIS_ACTOR_EMAIL is mutated per-test via this ref rather than a fixed
// mock, since the "no actor available at all" case needs it to be null.
let mockActorEmail: string | null = 'peter@peterpaullazan.com'
vi.mock('../config.js', () => ({
  get MCP_HRIS_ACTOR_EMAIL() {
    return mockActorEmail
  },
}))

const ORG_ID = '85ab7ff3-454b-4ba0-858d-037551986556'
const ACTOR = { sub: 'u1', email: 'peter@peterpaullazan.com', org_id: ORG_ID, user_role: 'super_admin' }

describe('team-access tools', () => {
  beforeEach(() => {
    assertOrgUsableMock.mockReset().mockResolvedValue({ id: ORG_ID, name: 'The Launchpad Inc' })
    resolveActorMock.mockReset().mockResolvedValue(ACTOR)
    queryMock.mockReset()
    withActorClaimsMock.mockClear()
    mockActorEmail = 'peter@peterpaullazan.com'
  })

  it('registers all three team-access tools', async () => {
    const { registerTeamAccessTools } = await import('./teamAccess.js')
    const { server, toolNames } = createFakeServer()
    registerTeamAccessTools(server)
    expect(toolNames().sort()).toEqual(['get_team_member', 'list_pending_invites', 'list_team_members'])
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
      expect(resolveActorMock).toHaveBeenCalledWith('peter@peterpaullazan.com')
      expect(queryMock).toHaveBeenCalledWith('SELECT * FROM get_team_members($1)', [ORG_ID])
      expect(resultJson(result)).toEqual(rows)
    })

    it('uses an explicit actor_email override instead of the default when the caller needs a different org member', async () => {
      const { registerTeamAccessTools } = await import('./teamAccess.js')
      const { server, getTool } = createFakeServer()
      registerTeamAccessTools(server)
      queryMock.mockResolvedValue({ rows: [] })

      await getTool('list_team_members').handler({ org_id: 'other-org', actor_email: 'someone-else@example.com' })

      expect(resolveActorMock).toHaveBeenCalledWith('someone-else@example.com')
    })

    it('fails clearly when no actor_email override is given and MCP_HRIS_ACTOR_EMAIL is unset', async () => {
      mockActorEmail = null
      const { registerTeamAccessTools } = await import('./teamAccess.js')
      const { server, getTool } = createFakeServer()
      registerTeamAccessTools(server)

      const result = await getTool('list_team_members').handler({ org_id: ORG_ID })

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('No actor email available')
      expect(resolveActorMock).not.toHaveBeenCalled()
    })

    it('never resolves an actor or calls the RPC when the org itself is rejected', async () => {
      assertOrgUsableMock.mockRejectedValue(new Error('No organization found with id bad-id'))
      const { registerTeamAccessTools } = await import('./teamAccess.js')
      const { server, getTool } = createFakeServer()
      registerTeamAccessTools(server)

      const result = await getTool('list_team_members').handler({ org_id: 'bad-id' })

      expect(result.isError).toBe(true)
      expect(resolveActorMock).not.toHaveBeenCalled()
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
})
