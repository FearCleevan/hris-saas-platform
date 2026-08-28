export function errorResult(message: string) {
  return { content: [{ type: 'text' as const, text: `Error: ${message}` }], isError: true }
}

export function jsonResult(data: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] }
}

// Node's AggregateError (thrown by `pg` when a connection attempt fails
// across multiple resolved addresses — e.g. a refused localhost connection
// tried over both IPv4 and IPv6) has an EMPTY top-level `.message`; the
// real per-attempt errors live in `.errors[]`. Caught this via
// `npm run verify` against a placeholder DB URL returning `"Error: "` with
// no detail — a bare `err.message` extraction silently swallows exactly the
// case (DB unreachable / bad connection string) this server most needs to
// report clearly. Recurse one level into `.errors` when present.
function describeError(err: unknown): string {
  if (err instanceof AggregateError && err.errors.length > 0) {
    return err.errors.map((e) => describeError(e)).join('; ')
  }
  if (err instanceof Error) {
    return err.message || `${err.name}${'code' in err ? ` (${(err as { code: unknown }).code})` : ''}`
  }
  return String(err)
}

// Wraps a tool handler so a thrown Error becomes a structured MCP tool
// error (isError: true) instead of an uncaught rejection that would crash
// the stdio transport — every tool in this server should go through this.
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
