export const MCP_HRIS_ACTOR_EMAIL: string | null = process.env.MCP_HRIS_ACTOR_EMAIL ?? null

// Optional. Empty/unset means "every org is reachable" — see
// docs/mcp-server-design.md section 3.3 for why this isn't a hard
// requirement here the way it might be for a more locked-down deployment.
export const MCP_HRIS_ALLOWED_ORG_IDS: string[] | null = process.env.MCP_HRIS_ALLOWED_ORG_IDS
  ? process.env.MCP_HRIS_ALLOWED_ORG_IDS.split(',').map((s) => s.trim()).filter(Boolean)
  : null
