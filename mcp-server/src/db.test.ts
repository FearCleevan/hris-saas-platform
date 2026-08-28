import { describe, it, expect, vi, beforeEach } from 'vitest'

// db.ts reads HRIS_DB_URL at module-evaluation time and throws if it's
// missing — must be set before the dynamic import below, even though pg
// itself is mocked and never actually connects anywhere.
process.env.HRIS_DB_URL = 'postgresql://test:test@localhost:5432/test'

const { mockClient, poolConnect, poolEnd } = vi.hoisted(() => {
  const mockClient = { query: vi.fn(), release: vi.fn() }
  const poolConnect = vi.fn(async () => mockClient)
  const poolEnd = vi.fn(async () => {})
  return { mockClient, poolConnect, poolEnd }
})

vi.mock('pg', () => ({
  default: { Pool: vi.fn(() => ({ connect: poolConnect, end: poolEnd })) },
}))

function calledStatements() {
  return mockClient.query.mock.calls.map((c) => c[0])
}

describe('withActorClaims', () => {
  beforeEach(() => {
    mockClient.query.mockReset()
    mockClient.release.mockReset()
    poolConnect.mockClear()
  })

  const claims = { sub: 'u1', org_id: 'org-a', user_role: 'super_admin' }

  it('runs BEGIN, sets claims via a parameterized set_config, runs the callback, then COMMIT — in that order', async () => {
    const { withActorClaims } = await import('./db.js')
    mockClient.query.mockResolvedValue({ rows: [] })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fn = vi.fn(async (query: any) => {
      await query('SELECT * FROM get_team_members($1)', ['org-a'])
      return { called: true }
    })

    const result = await withActorClaims(claims, fn)

    expect(result).toEqual({ called: true })
    expect(calledStatements()).toEqual([
      'BEGIN',
      'SELECT set_config($1, $2, true)',
      'SELECT * FROM get_team_members($1)',
      'COMMIT',
    ])
  })

  it('passes claims to set_config as a bound parameter, never string-interpolated into the SQL', async () => {
    const { withActorClaims } = await import('./db.js')
    mockClient.query.mockResolvedValue({ rows: [] })

    // A claim value containing a quote — if this were ever interpolated
    // into the SQL text instead of passed as a bind parameter, it would
    // corrupt the statement. This is the exact risk the module's own
    // header comment calls out.
    const trickyClaims = { sub: 'u1', org_id: "org-a'; DROP TABLE x; --", user_role: 'super_admin' }
    await withActorClaims(trickyClaims, async () => null)

    const setConfigCall = mockClient.query.mock.calls[1]
    expect(setConfigCall[0]).toBe('SELECT set_config($1, $2, true)')
    expect(setConfigCall[1]).toEqual(['request.jwt.claims', JSON.stringify(trickyClaims)])
    // The SQL text itself never contains the claim value.
    expect(setConfigCall[0]).not.toContain('DROP TABLE')
  })

  it('rolls back and rethrows when the callback throws, and never commits', async () => {
    const { withActorClaims } = await import('./db.js')
    mockClient.query.mockResolvedValue({ rows: [] })
    const boom = new Error('rpc raised: last active super admin')

    await expect(
      withActorClaims(claims, async () => {
        throw boom
      }),
    ).rejects.toThrow('rpc raised: last active super admin')

    const statements = calledStatements()
    expect(statements).toContain('ROLLBACK')
    expect(statements).not.toContain('COMMIT')
  })

  it('swallows a failed ROLLBACK and still surfaces the original error', async () => {
    const { withActorClaims } = await import('./db.js')
    mockClient.query.mockImplementation(async (sql: string) => {
      if (sql === 'ROLLBACK') throw new Error('connection already closed')
      if (sql === 'BEGIN') throw new Error('the real, original failure')
      return { rows: [] }
    })

    await expect(withActorClaims(claims, async () => null)).rejects.toThrow('the real, original failure')
  })

  it('always releases the client back to the pool, even on failure', async () => {
    const { withActorClaims } = await import('./db.js')
    mockClient.query.mockResolvedValue({ rows: [] })

    await withActorClaims(claims, async () => null).catch(() => {})
    expect(mockClient.release).toHaveBeenCalledTimes(1)

    mockClient.release.mockClear()
    await withActorClaims(claims, async () => {
      throw new Error('fail')
    }).catch(() => {})
    expect(mockClient.release).toHaveBeenCalledTimes(1)
  })

  it('never calls the callback if BEGIN itself fails', async () => {
    const { withActorClaims } = await import('./db.js')
    mockClient.query.mockImplementation(async (sql: string) => {
      if (sql === 'BEGIN') throw new Error('pool exhausted')
      return { rows: [] }
    })
    const fn = vi.fn()

    await expect(withActorClaims(claims, fn)).rejects.toThrow('pool exhausted')
    expect(fn).not.toHaveBeenCalled()
  })
})

describe('withPlainConnection', () => {
  beforeEach(() => {
    mockClient.query.mockReset()
    mockClient.release.mockReset()
  })

  it('hands the callback a bound query function and releases the client after', async () => {
    const { withPlainConnection } = await import('./db.js')
    mockClient.query.mockResolvedValue({ rows: [{ id: 'x' }] })

    const result = await withPlainConnection((query) => query('SELECT 1'))

    expect(result).toEqual({ rows: [{ id: 'x' }] })
    expect(mockClient.release).toHaveBeenCalledTimes(1)
  })

  it('still releases the client if the callback throws', async () => {
    const { withPlainConnection } = await import('./db.js')

    await expect(
      withPlainConnection(() => {
        throw new Error('boom')
      }),
    ).rejects.toThrow('boom')
    expect(mockClient.release).toHaveBeenCalledTimes(1)
  })

  it('does not open a transaction (no BEGIN/COMMIT) — plain connection only', async () => {
    const { withPlainConnection } = await import('./db.js')
    mockClient.query.mockResolvedValue({ rows: [] })

    await withPlainConnection((query) => query('SELECT 1'))

    expect(calledStatements()).toEqual(['SELECT 1'])
  })
})

describe('closePool', () => {
  it('ends the underlying pool', async () => {
    const { closePool } = await import('./db.js')
    await closePool()
    expect(poolEnd).toHaveBeenCalledTimes(1)
  })
})
