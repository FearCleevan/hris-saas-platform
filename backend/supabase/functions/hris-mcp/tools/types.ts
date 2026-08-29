// Deno port of mcp-server/src/tools/types.ts. No McpServer/registerTools
// here — v2's index.ts dispatches tools/call by array lookup directly over
// JSON-RPC, it doesn't register with an McpServer instance the way v1 does.
import type { z } from 'npm:zod@4'
import type { errorResult, jsonResult } from '../lib/toolResult.ts'

export type ToolResult = ReturnType<typeof jsonResult> | ReturnType<typeof errorResult>

// deno-lint-ignore no-explicit-any
export interface ToolDef<Args extends Record<string, unknown> = any> {
  name: string
  description: string
  schema: Record<string, z.ZodTypeAny>
  handler: (args: Args) => Promise<ToolResult>
}
