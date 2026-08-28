// Shared test helper (not itself a test file — vitest.config.ts only picks
// up src/**/*.test.ts). Captures registerXTools(server) calls without
// spinning up a real McpServer/stdio transport, so tool handlers can be
// invoked and asserted on directly.
export type ToolHandler = (args: Record<string, unknown>) => Promise<{
  content: { type: 'text'; text: string }[]
  isError?: boolean
}>

export interface RegisteredTool {
  description: string
  schema: unknown
  handler: ToolHandler
}

export function createFakeServer() {
  const tools = new Map<string, RegisteredTool>()
  const server = {
    tool: (name: string, description: string, schema: unknown, handler: ToolHandler) => {
      tools.set(name, { description, schema, handler })
    },
  }
  return {
    server: server as unknown as import('@modelcontextprotocol/sdk/server/mcp.js').McpServer,
    getTool: (name: string): RegisteredTool => {
      const tool = tools.get(name)
      if (!tool) throw new Error(`Tool "${name}" was never registered — check the register function ran.`)
      return tool
    },
    toolNames: () => [...tools.keys()],
  }
}

// Every tool result's single text block, parsed back to JSON — matches
// jsonResult()'s shape from toolResult.ts.
export function resultJson(result: Awaited<ReturnType<ToolHandler>>): unknown {
  return JSON.parse(result.content[0].text)
}
