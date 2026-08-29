// Deno port of mcp-server/src/supabaseClient.ts. SUPABASE_URL and
// SUPABASE_SERVICE_ROLE_KEY are auto-provided to every Supabase Edge
// Function — no secret needs setting for these specifically.
import { createClient } from 'npm:@supabase/supabase-js@2'

const url = Deno.env.get('SUPABASE_URL')
const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

if (!url || !key) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.')
}

// service_role bypasses RLS. Safe for plain table reads/writes (schedules,
// leave, offboarding, payroll, employees) because every query here is
// filtered by an explicit organization_id anyway — see
// docs/mcp-server-design.md section 3.1. Do NOT use this client for
// org-scoped RPCs like get_team_members, deactivate_member, etc. — those
// check auth.uid() inside the function body itself (SECURITY DEFINER, not
// RLS), which this client never populates. Use db.ts's withActorClaims()
// for those instead.
export const supabase = createClient(url, key)
