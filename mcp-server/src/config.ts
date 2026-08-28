export const MCP_HRIS_ACTOR_EMAIL: string | null = process.env.MCP_HRIS_ACTOR_EMAIL ?? null

// Extracted as a pure function (rather than inlined at module scope) so it's
// unit-testable without needing to fake process.env at import time — see
// config.test.ts.
export function parseAllowedOrgIds(raw: string | undefined): string[] | null {
  if (!raw) return null
  const ids = raw.split(',').map((s) => s.trim()).filter(Boolean)
  return ids.length > 0 ? ids : null
}

// Optional. Empty/unset means "every org is reachable" — see
// docs/mcp-server-design.md section 3.3 for why this isn't a hard
// requirement here the way it might be for a more locked-down deployment.
export const MCP_HRIS_ALLOWED_ORG_IDS: string[] | null = parseAllowedOrgIds(process.env.MCP_HRIS_ALLOWED_ORG_IDS)
