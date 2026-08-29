// Deno port of mcp-server/src/toolResult.ts — kept behaviorally identical
// (including the AggregateError unwrap, which is a standard JS global
// available in Deno too, not Node-specific).

export function errorResult(message: string) {
  return { content: [{ type: 'text' as const, text: `Error: ${message}` }], isError: true }
}

export function jsonResult(data: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }], isError: false as const }
}

function describeError(err: unknown): string {
  if (err instanceof AggregateError && err.errors.length > 0) {
    return err.errors.map((e) => describeError(e)).join('; ')
  }
  if (err instanceof Error) {
    return err.message || `${err.name}${'code' in err ? ` (${(err as { code: unknown }).code})` : ''}`
  }
  return String(err)
}

export function safeTool<Args extends Record<string, unknown>>(
  handler: (args: Args) => Promise<ReturnType<typeof jsonResult> | ReturnType<typeof errorResult>>,
) {
  return async (args: Args) => {
    try {
      return await handler(args)
    } catch (err) {
      return errorResult(describeError(err))
    }
  }
}
