import { describe, it, expect, vi, beforeEach } from 'vitest'
import { checkAllowlist } from './orgGuard.js'

describe('checkAllowlist', () => {
  it('allows any org when the allowlist is null (default — every org reachable)', () => {
    expect(() => checkAllowlist('any-org-id', null)).not.toThrow()
  })

  it('allows an org that is in the list', () => {
    expect(() => checkAllowlist('org-a', ['org-a', 'org-b'])).not.toThrow()
  })

  it('refuses an org that is not in the list', () => {
    expect(() => checkAllowlist('org-z', ['org-a', 'org-b'])).toThrow(/not in MCP_HRIS_ALLOWED_ORG_IDS/)
  })

  it('refuses every org when the list is empty (not null — explicitly locked down)', () => {
    expect(() => checkAllowlist('org-a', [])).toThrow(/not in MCP_HRIS_ALLOWED_ORG_IDS/)
  })
})

// assertOrgUsable's DB-existence-check half, mocking the service-role
// supabase client so this never touches the network.
vi.mock('./supabaseClient.js', () => {
  const maybeSingle = vi.fn()
  const eq = vi.fn(() => ({ maybeSingle }))
  const select = vi.fn(() => ({ eq }))
  const from = vi.fn(() => ({ select }))
  return { supabase: { from }, __mocks: { maybeSingle, eq, select, from } }
})

vi.mock('./config.js', () => ({ MCP_HRIS_ALLOWED_ORG_IDS: null }))

describe('assertOrgUsable', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns the org row when it exists', async () => {
    const { supabase } = (await import('./supabaseClient.js')) as any
    const { assertOrgUsable } = await import('./orgGuard.js')
    supabase.from().select().eq().maybeSingle.mockResolvedValue({
      data: { id: 'org-a', name: 'The Launchpad Inc' },
      error: null,
    })

    const result = await assertOrgUsable('org-a')
    expect(result).toEqual({ id: 'org-a', name: 'The Launchpad Inc' })
  })

  it('throws a clear error when no org exists with that id', async () => {
    const { supabase } = (await import('./supabaseClient.js')) as any
    const { assertOrgUsable } = await import('./orgGuard.js')
    supabase.from().select().eq().maybeSingle.mockResolvedValue({ data: null, error: null })

    await expect(assertOrgUsable('org-does-not-exist')).rejects.toThrow(/No organization found/)
  })

  it('throws when the query itself errors', async () => {
    const { supabase } = (await import('./supabaseClient.js')) as any
    const { assertOrgUsable } = await import('./orgGuard.js')
    supabase.from().select().eq().maybeSingle.mockResolvedValue({
      data: null,
      error: { message: 'connection reset' },
    })

    await expect(assertOrgUsable('org-a')).rejects.toThrow(/Failed to verify organization.*connection reset/)
  })
})
