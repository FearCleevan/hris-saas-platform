// One-off live verification for v2 Phase 3 — the hris-mcp Edge Function
// scaffold (OAuth shape + JSON-RPC dispatch, zero tools wired in yet).
// Run manually against the real deployed function. Doesn't need
// HRIS_MCP_TOKEN to be set for most of these checks — only the "with a
// real token" section at the end does.
const BASE = 'https://ztpoqosyrcepvwwwnsar.supabase.co/functions/v1/hris-mcp'

async function check(label, fn) {
  try {
    const result = await fn()
    console.log(`OK   ${label}:`, result)
  } catch (err) {
    console.log(`FAIL ${label}:`, err.message)
  }
}

await check('.well-known/oauth-authorization-server returns valid metadata', async () => {
  const res = await fetch(`${BASE}/.well-known/oauth-authorization-server`)
  const body = await res.json()
  if (!body.authorization_endpoint?.endsWith('/authorize')) throw new Error('bad metadata: ' + JSON.stringify(body))
  return body
})

await check('.well-known/oauth-protected-resource returns valid metadata', async () => {
  const res = await fetch(`${BASE}/.well-known/oauth-protected-resource`)
  const body = await res.json()
  if (!body.resource) throw new Error('bad metadata: ' + JSON.stringify(body))
  return body
})

await check('POST tools/list without auth returns 401 with WWW-Authenticate', async () => {
  const res = await fetch(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
  })
  if (res.status !== 401) throw new Error(`expected 401, got ${res.status}`)
  if (!res.headers.get('WWW-Authenticate')) throw new Error('missing WWW-Authenticate header')
  return `${res.status} ${res.headers.get('WWW-Authenticate')}`
})

await check('GET /authorize with valid params renders the form', async () => {
  const url = new URL(`${BASE}/authorize`)
  url.searchParams.set('redirect_uri', 'https://claude.ai/api/mcp/auth_callback')
  url.searchParams.set('client_id', 'verify-script')
  url.searchParams.set('code_challenge', 'test-challenge')
  url.searchParams.set('code_challenge_method', 'S256')
  const res = await fetch(url)
  const html = await res.text()
  if (!html.includes('HRIS_MCP_TOKEN')) throw new Error('form missing token field')
  return `${res.status}, ${html.length} bytes`
})

await check('GET /authorize with a disallowed redirect_uri is rejected', async () => {
  const url = new URL(`${BASE}/authorize`)
  url.searchParams.set('redirect_uri', 'https://evil.example.com')
  url.searchParams.set('client_id', 'verify-script')
  url.searchParams.set('code_challenge', 'test-challenge')
  url.searchParams.set('code_challenge_method', 'S256')
  const res = await fetch(url)
  if (res.status !== 400) throw new Error(`expected 400, got ${res.status}`)
  return res.status
})

if (process.env.HRIS_MCP_TOKEN) {
  await check('POST tools/list WITH the real token returns an empty tools array (Phase 3 has zero tools wired in)', async () => {
    const res = await fetch(BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.HRIS_MCP_TOKEN}` },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
    })
    const body = await res.json()
    if (!Array.isArray(body.result?.tools)) throw new Error('bad response: ' + JSON.stringify(body))
    return `${body.result.tools.length} tools (expected 0 until Phase 4)`
  })
} else {
  console.log('SKIP the-real-token checks — set HRIS_MCP_TOKEN in your shell to run them too.')
}
