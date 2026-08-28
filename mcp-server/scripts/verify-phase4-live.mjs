// One-off live verification for Phase 4's write tools — the highest-risk
// phase, so this is deliberately careful: only the disposable "Test test"
// employee is ever touched, and everything is restored/deleted at the end.
//
// NOT covered here (relies on unit tests instead — see the memory note for
// why): update_clearance_item (org has zero clearance_items configured —
// would need building checklist-template infrastructure from scratch to
// exercise live) and resolve_dispute/reject_dispute (org has zero payslips
// — payroll_disputes.payslip_id is a required FK, same problem).
//
// Before running: insert a disposable offboarding_records row for the test
// employee with clearance_status already 'cleared' (bypassing
// clearance_progress, since that infrastructure doesn't exist for this
// org), e.g.:
//   INSERT INTO offboarding_records (employee_id, organization_id,
//     separation_type, last_day_of_work, clearance_status, final_pay_status)
//   VALUES ('964fe818-a246-4bf4-aca9-514864ebcaed',
//     '85ab7ff3-454b-4ba0-858d-037551986556', 'resignation', '2026-08-31',
//     'cleared', 'computed') RETURNING id;
// and paste that id into OFFBOARDING_ID below.
//
// After running: restore the employee (is_active=true, status='active')
// and delete the offboarding_records row — this script does NOT clean up
// after itself, since complete_offboarding's effect (employee termination)
// is exactly what's being verified and shouldn't be silently undone by the
// same script that just proved it worked.
import { fileURLToPath } from 'node:url'
import { config as loadDotenv } from 'dotenv'
loadDotenv({ path: fileURLToPath(new URL('../.env.local', import.meta.url)) })

import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'

const ORG_ID = '85ab7ff3-454b-4ba0-858d-037551986556' // The Launchpad Inc
const TEST_EMPLOYEE = '964fe818-a246-4bf4-aca9-514864ebcaed' // disposable "Test test" employee
const OFFBOARDING_ID = process.env.PHASE4_OFFBOARDING_ID // set this — see comment above

if (!OFFBOARDING_ID) {
  console.error('Set PHASE4_OFFBOARDING_ID to a disposable offboarding_records id first — see this file\'s header comment.')
  process.exit(1)
}

const transport = new StdioClientTransport({
  command: process.execPath,
  args: ['dist/index.js'],
  env: { ...process.env },
})
const client = new Client({ name: 'phase4-live-check', version: '0.0.1' }, { capabilities: {} })
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
  console.log(`${result.isError ? 'ERROR' : 'OK'} ${name}(${JSON.stringify(args)}) ->`, JSON.stringify(parsed))
  return { ...result, parsed }
}

console.log('=== update_final_pay_status ===')
await call('update_final_pay_status', { org_id: ORG_ID, offboarding_id: OFFBOARDING_ID, status: 'released', amount: 5000 })

console.log('=== complete_offboarding ===')
await call('complete_offboarding', { org_id: ORG_ID, offboarding_id: OFFBOARDING_ID, confirm: false }) // expect refusal
await call('complete_offboarding', { org_id: ORG_ID, offboarding_id: OFFBOARDING_ID, confirm: true })
const afterComplete = await call('get_employee', { org_id: ORG_ID, employee_id: TEST_EMPLOYEE })
console.log('employee status/is_active after complete_offboarding (expect terminated/false):', afterComplete.parsed.status, afterComplete.parsed.is_active)
await call('complete_offboarding', { org_id: ORG_ID, offboarding_id: OFFBOARDING_ID, confirm: true }) // idempotency check — must not error

console.log('=== REMEMBER TO CLEAN UP: restore the employee and delete the offboarding_records row — see header comment ===')

await client.close()
process.exit(0)
