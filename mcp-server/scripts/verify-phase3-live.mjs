// One-off live verification for Phase 3's write tools, run manually against
// real (disposable test) data — not part of the committed suite.
import { fileURLToPath } from 'node:url'
import { config as loadDotenv } from 'dotenv'
loadDotenv({ path: fileURLToPath(new URL('../.env.local', import.meta.url)) })

import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'

const ORG_ID = '85ab7ff3-454b-4ba0-858d-037551986556' // The Launchpad Inc
const TEST_EMPLOYEE = '964fe818-a246-4bf4-aca9-514864ebcaed' // disposable "Test test" employee
const VACATION_LEAVE_TYPE = 'e33eebd8-3262-4baf-a252-4fdf9318e918' // real, permanently-seeded Vacation Leave

const transport = new StdioClientTransport({
  command: process.execPath,
  args: ['dist/index.js'],
  env: { ...process.env },
})
const client = new Client({ name: 'phase3-live-check', version: '0.0.1' }, { capabilities: {} })
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

console.log('=== create_schedule / update_schedule / assign_employees_to_schedule ===')
const scheduleA = await call('create_schedule', {
  org_id: ORG_ID, name: 'QA Phase3 Schedule A', code: 'QA3A', start_time: '08:00', end_time: '17:00',
  break_minutes: 60, grace_period_minutes: 15, is_night_shift: false, is_flexible: false,
  work_days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], color: '#0038a8', departments: [],
})
const scheduleB = await call('create_schedule', {
  org_id: ORG_ID, name: 'QA Phase3 Schedule B', code: 'QA3B', start_time: '13:00', end_time: '22:00',
  break_minutes: 60, grace_period_minutes: 15, is_night_shift: false, is_flexible: false,
  work_days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], color: '#059669', departments: [],
})
const aId = scheduleA.parsed.id
const bId = scheduleB.parsed.id

await call('assign_employees_to_schedule', { org_id: ORG_ID, schedule_id: aId, employee_ids: [TEST_EMPLOYEE] })
const afterA = await call('get_schedule_assignments', { org_id: ORG_ID, schedule_id: aId })
console.log('assigned to A (expect 1 row):', afterA.parsed.length)

await call('assign_employees_to_schedule', { org_id: ORG_ID, schedule_id: bId, employee_ids: [TEST_EMPLOYEE] })
const afterAAgain = await call('get_schedule_assignments', { org_id: ORG_ID, schedule_id: aId })
console.log('still on A after moving to B (expect 0 — no double-booking):', afterAAgain.parsed.length)
const afterB = await call('get_schedule_assignments', { org_id: ORG_ID, schedule_id: bId })
console.log('on B now (expect 1):', afterB.parsed.length)

await call('update_schedule', {
  org_id: ORG_ID, schedule_id: aId, name: 'QA Phase3 Schedule A (renamed)', code: 'QA3A', start_time: '09:00',
  end_time: '18:00', break_minutes: 60, grace_period_minutes: 15, is_night_shift: false, is_flexible: false,
  work_days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], color: '#0038a8', departments: [],
})

console.log('=== apply_leave / reject_leave_request (round 1) ===')
const applied1 = await call('apply_leave', {
  org_id: ORG_ID, employee_id: TEST_EMPLOYEE, leave_type_id: VACATION_LEAVE_TYPE, start_date: '2026-10-01',
  end_date: '2026-10-01', total_days: 1, reason: 'QA phase3 test (reject path)',
})
const balBefore = await call('get_leave_balances', { org_id: ORG_ID, employee_id: TEST_EMPLOYEE, year: 2026 })
console.log('pending_days after apply (expect >0):', balBefore.parsed.find((b) => b.leave_type_id === VACATION_LEAVE_TYPE)?.pending_days)

await call('reject_leave_request', { org_id: ORG_ID, request_id: applied1.parsed.request_id, remarks: 'QA reject test' })
const balAfterReject = await call('get_leave_balances', { org_id: ORG_ID, employee_id: TEST_EMPLOYEE, year: 2026 })
console.log('pending_days after reject (expect reverted):', balAfterReject.parsed.find((b) => b.leave_type_id === VACATION_LEAVE_TYPE)?.pending_days)

console.log('=== apply_leave / approve_leave_request (round 2) ===')
const applied2 = await call('apply_leave', {
  org_id: ORG_ID, employee_id: TEST_EMPLOYEE, leave_type_id: VACATION_LEAVE_TYPE, start_date: '2026-10-05',
  end_date: '2026-10-05', total_days: 1, reason: 'QA phase3 test (approve path)',
})
await call('approve_leave_request', { org_id: ORG_ID, request_id: applied2.parsed.request_id, remarks: 'QA approve test' })
const balAfterApprove = await call('get_leave_balances', { org_id: ORG_ID, employee_id: TEST_EMPLOYEE, year: 2026 })
const vlBalance = balAfterApprove.parsed.find((b) => b.leave_type_id === VACATION_LEAVE_TYPE)
console.log('after approve — pending_days (expect back to 0), used_days (expect +1):', vlBalance?.pending_days, vlBalance?.used_days)

console.log('=== done — see script output above for cleanup ids to remove manually if needed ===')
console.log('schedules created:', aId, bId)
