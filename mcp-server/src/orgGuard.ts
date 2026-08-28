import { supabase } from './supabaseClient.js'
import { MCP_HRIS_ALLOWED_ORG_IDS } from './config.js'

// Every org in the platform is reachable by default (2026-08-28 decision,
// see docs/mcp-server-design.md section 3.3) — this is a sanity check
// against typos/garbage ids, not a scoping restriction. If
// MCP_HRIS_ALLOWED_ORG_IDS is set, it additionally restricts which orgs can
// be touched at all.
export async function assertOrgUsable(orgId: string): Promise<{ id: string; name: string }> {
  if (MCP_HRIS_ALLOWED_ORG_IDS && !MCP_HRIS_ALLOWED_ORG_IDS.includes(orgId)) {
    throw new Error(
      `Organization ${orgId} is not in MCP_HRIS_ALLOWED_ORG_IDS. Refusing to proceed. ` +
        `(Currently allowed: ${MCP_HRIS_ALLOWED_ORG_IDS.join(', ')})`,
    )
  }

  const { data, error } = await supabase
    .from('organizations')
    .select('id, name')
    .eq('id', orgId)
    .maybeSingle()

  if (error) throw new Error(`Failed to verify organization ${orgId}: ${error.message}`)
  if (!data) throw new Error(`No organization found with id ${orgId} — refusing to proceed on an unverified org id.`)

  return data
}
