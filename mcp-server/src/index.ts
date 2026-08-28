// Must be the first import: it loads .env.local before any other module
// (like ./db.js / ./supabaseClient.js, transitively imported below) reads
// process.env at module-evaluation time. See src/env.ts for why this has to
// be a separate imported module rather than an inline statement in this file.
import './env.js'
import { pathToFileURL } from 'node:url'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { registerActorTools } from './tools/actor.js'
import { registerOrgTools } from './tools/orgs.js'
import { registerTeamAccessTools } from './tools/teamAccess.js'
import { registerEmployeeTools } from './tools/employees.js'
import { registerScheduleTools } from './tools/schedule.js'
import { registerLeaveTools } from './tools/leave.js'
import { registerOffboardingTools } from './tools/offboarding.js'
import { registerPayrollTools } from './tools/payroll.js'
import { closePool } from './db.js'

export const server = new McpServer({
  name: 'hris-mcp-server',
  version: '0.1.0',
})

registerActorTools(server)
registerOrgTools(server)
registerTeamAccessTools(server)
registerEmployeeTools(server)
registerScheduleTools(server)
registerLeaveTools(server)
registerOffboardingTools(server)
registerPayrollTools(server)

async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
}

// Use pathToFileURL for a platform-correct comparison — on Windows,
// `file://${process.argv[1]}` (backslashes, missing drive-letter slash)
// never equals import.meta.url, so a naive guard here would never match and
// main() would never run. Same fix as crm-project's mcp-server/src/index.ts.
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((err) => {
    console.error('[hris-mcp-server] fatal error:', err)
    process.exit(1)
  })

  process.on('SIGINT', async () => {
    await closePool()
    process.exit(0)
  })
}
