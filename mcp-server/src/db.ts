import pg from 'pg'

const connectionString = process.env.HRIS_DB_URL

if (!connectionString) {
  throw new Error(
    'Missing HRIS_DB_URL. Copy .env.local.example to .env.local and fill in the direct connection string.',
  )
}

const pool = new pg.Pool({ connectionString })

export interface ActorClaims {
  sub: string // auth.uid()
  org_id: string
  user_role: string
}

// Reproduces, with a real connection instead of hand-typed SQL, the
// `SET LOCAL request.jwt.claims = '...'; SELECT <rpc>(...);` pattern used
// manually throughout the 2026-08-27 QA session (see
// docs/mcp-server-design.md section 3.1 for why supabase-js's REST-based
// .rpc() can't do this: PostgREST doesn't expose "run this as one
// transaction," and two separate REST calls aren't guaranteed to land on the
// same backend connection anyway).
//
// Uses set_config() as a parameterized function call rather than string-
// interpolating a `SET LOCAL ...` statement — avoids any risk of a claim
// value (e.g. an org name with a stray quote) breaking out of the SQL
// literal, the same way every other query in this server is parameterized.
//
// IMPORTANT: HRIS_DB_URL should be the Session pooler connection (port
// 5432) — not the Transaction pooler (port 6543). See .env.local.example.
// A single pg.Pool client checked out via pool.connect() stays on one
// backend connection for its lifetime regardless of pooling mode, but
// transaction-mode pooling at the Supabase layer can still hand this app's
// *next* pool.connect() call a connection some other session left
// mid-transaction state on, which SET LOCAL's transaction-scoping doesn't
// protect against. (Direct connection would sidestep this entirely, but is
// IPv6-only on the Free tier and didn't resolve on this network — confirmed
// 2026-08-28.)
export async function withActorClaims<T>(
  claims: ActorClaims,
  fn: (query: pg.PoolClient['query']) => Promise<T>,
): Promise<T> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query('SELECT set_config($1, $2, true)', [
      'request.jwt.claims',
      JSON.stringify(claims),
    ])
    const result = await fn(client.query.bind(client))
    await client.query('COMMIT')
    return result
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    throw err
  } finally {
    client.release()
  }
}

// For calls that don't need actor context (e.g. a raw existence check) but
// still need a transaction-consistent connection. Most reads should prefer
// supabaseClient.ts's service-role client instead — this is only for the
// rare case of needing a plain SQL query pg.Pool can serve directly.
export async function withPlainConnection<T>(fn: (query: pg.PoolClient['query']) => Promise<T>): Promise<T> {
  const client = await pool.connect()
  try {
    return await fn(client.query.bind(client))
  } finally {
    client.release()
  }
}

export async function closePool(): Promise<void> {
  await pool.end()
}
