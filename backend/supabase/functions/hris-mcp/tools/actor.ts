// Deno port of mcp-server/src/tools/actor.ts.
import { z } from 'npm:zod@4'
import { resolveActor } from '../lib/actor.ts'
import { safeTool, jsonResult } from '../lib/toolResult.ts'
import type { ToolDef } from './types.ts'

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
