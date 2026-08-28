import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { resolveActor } from '../actor.js'
import { safeTool, jsonResult } from '../toolResult.js'
import { registerTools, type ToolDef } from './types.js'

export const simulateActorTool: ToolDef<{ email: string }> = {
  name: 'simulate_actor',
  description:
    'Resolve a HRISPH user by email to their user_id, org_id, and role — the identity every org-scoped tool in ' +
    'this server acts as. Looked up fresh from the DB (not cached), so role/org changes are picked up automatically.',
  schema: { email: z.string().email() },
  handler: safeTool(async ({ email }) => {
    const actor = await resolveActor(email)
    return jsonResult(actor)
  }),
}

export const actorTools: ToolDef[] = [simulateActorTool]

export function registerActorTools(server: McpServer) {
  registerTools(server, actorTools)
}
