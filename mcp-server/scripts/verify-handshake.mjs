import { fileURLToPath } from 'node:url'
import { config as loadDotenv } from 'dotenv'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'

// This script's OWN process needs MCP_HRIS_ACTOR_EMAIL too (for the
// simulate_actor test call below) — the server child process loads
// .env.local itself via src/env.ts, but that only affects the child, not
// this parent script. Without this, MCP_HRIS_ACTOR_EMAIL is undefined here
// even though the server can see it fine, and the test call below silently
// falls back to a fake email instead of exercising the real configured actor.
loadDotenv({ path: fileURLToPath(new URL('../.env.local', import.meta.url)) })

// Same reasoning as crm-project's verify-handshake.mjs: launched the same
// way `claude mcp add` will launch it for real, so this proves the actual
// launch path (env loading, dist/index.js resolution) works — not just that
// the TypeScript compiles.
const transport = new StdioClientTransport({
  command: process.execPath,
  args: ['dist/index.js'],
  env: { ...process.env },
})

const client = new Client({ name: 'verify-handshake-client', version: '0.0.1' }, { capabilities: {} })

await client.connect(transport)

console.log('=== Server Info ===')
console.log(JSON.stringify(client.getServerVersion(), null, 2))

console.log('=== tools/list ===')
const tools = await client.listTools()
const toolNames = (tools.tools ?? []).map((t) => t.name)
console.log(JSON.stringify(toolNames, null, 2))

const expectedTools = [
  'simulate_actor',
  'get_org_context',
  'list_team_members',
  'list_pending_invites',
  'get_team_member',
  'search_employees',
  'get_employee',
  'list_schedules',
  'get_schedule_assignments',
  'list_leave_types',
  'list_leave_requests',
  'get_leave_balances',
  'list_offboarding_records',
  'get_offboarding_detail',
  'list_payroll_runs',
  'list_payroll_disputes',
]
console.log('=== expected tools present? ===')
let allPresent = true
for (const name of expectedTools) {
  const present = toolNames.includes(name)
  if (!present) allPresent = false
  console.log(`${name}: ${present ? 'FOUND' : 'MISSING'}`)
}

console.log('=== callTool: simulate_actor (requires real .env.local to succeed; expects a structured result either way, not a crash) ===')
let actorOrgId = null
try {
  const result = await client.callTool({
    name: 'simulate_actor',
    arguments: { email: process.env.MCP_HRIS_ACTOR_EMAIL ?? 'nobody@example.com' },
  })
  console.log(JSON.stringify(result, null, 2))
  if (!result.isError) {
    actorOrgId = JSON.parse(result.content[0].text).org_id
  }
} catch (err) {
  console.log('callTool raised (unexpected):', err?.code, err?.message)
}

// Exercises the full withActorClaims + RPC pipeline over the real MCP
// protocol (not just a direct node script) — the thing this whole server
// exists to replace the manual `SET LOCAL request.jwt.claims` SQL for.
if (actorOrgId) {
  console.log('=== callTool: list_team_members (exercises the full SET LOCAL claims + RPC pipeline) ===')
  try {
    const result = await client.callTool({ name: 'list_team_members', arguments: { org_id: actorOrgId } })
    console.log(JSON.stringify(result, null, 2))
  } catch (err) {
    console.log('callTool raised (unexpected):', err?.code, err?.message)
  }
} else {
  console.log('=== skipping list_team_members (no real actor resolved — .env.local likely still has placeholder values) ===')
}

console.log('=== summary ===')
console.log(`All expected tools registered: ${allPresent}`)

await client.close()
process.exit(0)
