import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !key) {
  throw new Error(
    'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Copy .env.local.example to .env.local and fill in real values.',
  )
}

// service_role bypasses RLS. Safe to use for plain table reads (schedules,
// leave, offboarding, payroll, employees) because none of those tables'
// policies matter once RLS is bypassed and every query is filtered by an
// explicit organization_id anyway — see docs/mcp-server-design.md section
// 3.1. Do NOT use this client for org-scoped RPCs like get_team_members,
// deactivate_member, etc. — those check auth.uid() inside the function body
// itself (SECURITY DEFINER, not RLS), which this client never populates.
// Use db.ts's withActorClaims() for those instead.
export const supabase = createClient(url, key)
