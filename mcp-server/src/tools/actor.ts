import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { resolveActor } from '../actor.js'
import { safeTool, jsonResult } from '../toolResult.js'

export function registerActorTools(server: McpServer) {
  server.tool(
    'simulate_actor',
    'Resolve a HRISPH user by email to their user_id, org_id, and role — the identity every org-scoped tool in ' +
      'this server acts as. Looked up fresh from the DB (not cached), so role/org changes are picked up automatically.',
    { email: z.string().email() },
    safeTool(async ({ email }) => {
      const actor = await resolveActor(email)
      return jsonResult(actor)
    }),
  )
}
