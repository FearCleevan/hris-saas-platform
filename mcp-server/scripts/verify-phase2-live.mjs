// One-off live verification script for Phase 2's write tools, run manually
// against real (disposable test) data — not part of the committed test
// suite, not run in CI. Mirrors the manual SQL verification done during the
// 2026-08-27 QA session, but through the actual MCP tool layer this time.
import { fileURLToPath } from 'node:url'
import { config as loadDotenv } from 'dotenv'
loadDotenv({ path: fileURLToPath(new URL('../.env.local', import.meta.url)) })

import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'

const ORG_ID = '85ab7ff3-454b-4ba0-858d-037551986556' // The Launchpad Inc
const LAZANPETERPAUL = '82735626-9b9d-439e-881d-aa4054bf6f34'
const FEARCLEEVAN123 = 'c4ff6cea-3fcd-4486-80e9-d8ac2aa72aa3'

const transport = new StdioClientTransport({
  command: process.execPath,
  args: ['dist/index.js'],
  env: { ...process.env },
})
const client = new Client({ name: 'phase2-live-check', version: '0.0.1' }, { capabilities: {} })
await client.connect(transport)

async function call(name, args) {
  const result = await client.callTool({ name, arguments: args })
  const parsed = (() => {
    try {
      return JSON.parse(result.content[0].text)
    } catch {
      return result.content[0].text
    }
  })()
  console.log(`${result.isError ? 'ERROR' : 'OK'} ${name}(${JSON.stringify(args)}) ->`, parsed)
  return { ...result, parsed }
}

console.log('=== deactivate_member/reactivate_member round-trip on lazanpeterpaul ===')
await call('deactivate_member', { org_id: ORG_ID, user_id: LAZANPETERPAUL, confirm: false }) // expect refusal
await call('deactivate_member', { org_id: ORG_ID, user_id: LAZANPETERPAUL, confirm: true })
const afterDeactivate = await call('get_team_member', { org_id: ORG_ID, user_id: LAZANPETERPAUL })
console.log('is_active after deactivate (expect false):', afterDeactivate.parsed.is_active)
await call('reactivate_member', { org_id: ORG_ID, user_id: LAZANPETERPAUL })
const afterReactivate = await call('get_team_member', { org_id: ORG_ID, user_id: LAZANPETERPAUL })
console.log('is_active after reactivate (expect true):', afterReactivate.parsed.is_active)

console.log('=== change_user_role round-trip on fearcleevan123 ===')
await call('change_user_role', { org_id: ORG_ID, user_id: FEARCLEEVAN123, new_role_slug: 'hr_staff', confirm: false }) // expect refusal
await call('change_user_role', { org_id: ORG_ID, user_id: FEARCLEEVAN123, new_role_slug: 'hr_staff', confirm: true })
const afterDemote = await call('get_team_member', { org_id: ORG_ID, user_id: FEARCLEEVAN123 })
console.log('role after demote (expect hr_staff):', afterDemote.parsed.role_slug)
await call('change_user_role', { org_id: ORG_ID, user_id: FEARCLEEVAN123, new_role_slug: 'super_admin', confirm: true })
const afterRestore = await call('get_team_member', { org_id: ORG_ID, user_id: FEARCLEEVAN123 })
console.log('role after restore (expect super_admin):', afterRestore.parsed.role_slug)

// NOT tested live: the last-super-admin guard against a real account. All
// three accounts in this org (peter, fearcleevan123, lazanpeterpaul) are
// currently active super_admins, so demoting any ONE of them wouldn't even
// trigger the guard (2 others would remain) — and demoting peter's real,
// actually-logged-in account specifically to force the guard is the same
// risk the 2026-08-27 QA session already declined to take for the DB-level
// version of this same guard. The guard's logic is covered thoroughly by
// mocked unit tests instead (teamAccess.test.ts) — see that file for the
// "refuses even with confirm: true" / "inactive doesn't count as coverage"
// cases this script deliberately does not re-attempt against real data.

await client.close()
process.exit(0)
