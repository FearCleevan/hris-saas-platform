// Deno port of mcp-server/src/db.ts. Confirmed live (v2 Phase 1 spike,
// pg-spike function) that npm:pg's Pool/PoolClient correctly holds one
// connection across BEGIN/set_config/COMMIT using SUPABASE_DB_URL, which is
// auto-provided to every Edge Function — unlike v1's mcp-server (run from a
// home network, where the IPv6-only direct connection didn't resolve and a
// manually-configured Session pooler URL was needed instead), Supabase's own
// Edge Function runtime has proper IPv6 connectivity to the direct
// connection, so no extra secret is needed here.
import pg from 'npm:pg@8.13.1'

const connectionString = Deno.env.get('SUPABASE_DB_URL')

if (!connectionString) {
  throw new Error('Missing SUPABASE_DB_URL (should be auto-provided by the Supabase platform).')
}

const pool = new pg.Pool({ connectionString })

export interface ActorClaims {
  sub: string // auth.uid()
  org_id: string
  user_role: string
}

// Reproduces the `SET LOCAL request.jwt.claims = '...'; SELECT <rpc>(...);`
// pattern via a real connection instead of hand-typed SQL — see
// mcp-server/src/db.ts's header comment for the full rationale (PostgREST
// can't do this in one transaction; two REST calls aren't guaranteed to land
// on the same backend connection).
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

// For calls that don't need actor context but still need a
// transaction-consistent connection (e.g. actor.ts's auth.users lookup,
// which supabaseClient.ts's PostgREST-based client can't reach).
export async function withPlainConnection<T>(fn: (query: pg.PoolClient['query']) => Promise<T>): Promise<T> {
  const client = await pool.connect()
  try {
    return await fn(client.query.bind(client))
  } finally {
    client.release()
  }
}
