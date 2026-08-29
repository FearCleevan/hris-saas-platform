// Deno port of mcp-server/src/config.ts. process.env -> Deno.env.get.

export const MCP_HRIS_ACTOR_EMAIL: string | null = Deno.env.get('MCP_HRIS_ACTOR_EMAIL') ?? null

export function parseAllowedOrgIds(raw: string | undefined): string[] | null {
  if (!raw) return null
  const ids = raw.split(',').map((s) => s.trim()).filter(Boolean)
  return ids.length > 0 ? ids : null
}

// Optional. Empty/unset means "every org is reachable" — see
// docs/mcp-server-design.md section 3.3.
export const MCP_HRIS_ALLOWED_ORG_IDS: string[] | null = parseAllowedOrgIds(Deno.env.get('MCP_HRIS_ALLOWED_ORG_IDS'))
