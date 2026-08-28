import { describe, it, expect, vi, beforeEach } from 'vitest'

const queryMock = vi.fn()

vi.mock('./db.js', () => ({
  withPlainConnection: vi.fn(async (fn: (query: unknown) => unknown) => fn(queryMock)),
}))

describe('resolveActor', () => {
  beforeEach(() => {
    queryMock.mockReset()
  })

  it('normalizes email to lowercase/trimmed before querying', async () => {
    const { resolveActor } = await import('./actor.js')
    queryMock.mockResolvedValue({
      rows: [{ user_id: 'u1', email: 'Peter@PeterPaulLazan.com', org_id: 'org-a', role_slug: 'super_admin' }],
    })

    await resolveActor('  Peter@PeterPaulLazan.com  ')

    expect(queryMock).toHaveBeenCalledWith(expect.any(String), ['peter@peterpaullazan.com'])
  })

  it('returns the resolved actor on a full match — the happy path', async () => {
    const { resolveActor } = await import('./actor.js')
    queryMock.mockResolvedValue({
      rows: [{ user_id: 'u1', email: 'peter@peterpaullazan.com', org_id: 'org-a', role_slug: 'super_admin' }],
    })

    const actor = await resolveActor('peter@peterpaullazan.com')

    expect(actor).toEqual({
      sub: 'u1',
      email: 'peter@peterpaullazan.com',
      org_id: 'org-a',
      user_role: 'super_admin',
    })
  })

  // The next three cases are the fail-closed behavior this module exists
  // for — deliberately mirroring the RBAC bug fixed in the app itself
  // earlier this project (a null/failed role lookup must never be silently
  // treated as "act with no/default permissions"). See this file's header
  // comment in actor.ts.

  it('throws when no auth.users row matches the email at all', async () => {
    const { resolveActor } = await import('./actor.js')
    queryMock.mockResolvedValue({ rows: [] })

    await expect(resolveActor('nobody@example.com')).rejects.toThrow(/No auth\.users row found/)
  })

  it('throws when the user has no organization_id — refuses to guess', async () => {
    const { resolveActor } = await import('./actor.js')
    queryMock.mockResolvedValue({
      rows: [{ user_id: 'u1', email: 'orphan@example.com', org_id: null, role_slug: null }],
    })

    await expect(resolveActor('orphan@example.com')).rejects.toThrow(/no organization_id/)
  })

  it('throws when the user has an org but no resolvable role — refuses to guess a default role', async () => {
    const { resolveActor } = await import('./actor.js')
    queryMock.mockResolvedValue({
      rows: [{ user_id: 'u1', email: 'no-role@example.com', org_id: 'org-a', role_slug: null }],
    })

    await expect(resolveActor('no-role@example.com')).rejects.toThrow(/no resolvable role/)
  })
})
