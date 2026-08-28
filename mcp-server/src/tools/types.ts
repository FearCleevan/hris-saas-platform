import type { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { errorResult, jsonResult } from '../toolResult.js'

export type ToolResult = ReturnType<typeof jsonResult> | ReturnType<typeof errorResult>

// A tool definition independent of any specific transport. v1 registers
// these with McpServer's stdio server.tool(name, description, schema,
// handler); a v2 Edge Function would instead put them in a flat array and
// dispatch by name over raw JSON-RPC (matching crm-project's crm-mcp/tools/
// registry.ts shape) — see docs/mcp-server-v2-design.md section 3. The
// point of this type existing is so v2 can import the exact same
// definitions instead of hand-duplicating every tool file the way
// crm-project's v1/v2 do.
export interface ToolDef<Args extends Record<string, unknown> = any> {
  name: string
  description: string
  schema: Record<string, z.ZodTypeAny>
  handler: (args: Args) => Promise<ToolResult>
}

// Thin loop over McpServer.tool() — shared so each tools/*.ts file's
// registerXTools(server) is a one-liner instead of repeating this loop.
export function registerTools(server: McpServer, defs: ToolDef[]): void {
  for (const def of defs) {
    server.tool(def.name, def.description, def.schema, def.handler)
  }
}
