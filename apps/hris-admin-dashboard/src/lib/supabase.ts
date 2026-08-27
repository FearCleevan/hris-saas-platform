import { createClient } from '@supabase/supabase-js';

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL  as string | undefined;
const supabaseKey  = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// Returns true when Supabase env vars are configured.
// When false the app falls back to mock auth (local dev without Supabase).
export const isSupabaseConfigured =
  !!supabaseUrl && supabaseUrl !== 'your_supabase_url_here' &&
  !!supabaseKey && supabaseKey !== 'your_anon_key_here';

// The client is only created when Supabase is configured.
// All call sites guard with `isSupabaseConfigured` before using it.
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseKey!, {
      auth: {
        persistSession:     true,
        detectSessionInUrl: true,  // picks up tokens from /auth/callback hash
        autoRefreshToken:   true,
      },
    })
  : null;

// ── Profile helpers ────────────────────────────────────────────────

export interface SupabaseProfile {
  id:              string;
  organization_id: string | null;
  full_name:       string;
  avatar_url:      string | null;
  must_change_password: boolean;
}

export interface SupabaseOrg {
  id:   string;
  name: string;
  slug: string;
  plan: 'trial' | 'starter' | 'pro' | 'enterprise';
  logo_url:      string | null;
  industry:      string | null;
  company_size:  string | null;
  trial_ends_at: string;
}

export interface SupabaseUserRole {
  role_slug: string;
}

/** Fetch the user's profile, organization, and role after sign-in. */
export async function fetchUserContext(userId: string): Promise<{
  profile: SupabaseProfile | null;
  org:     SupabaseOrg | null;
  role:    string | null;
}> {
  if (!supabase) return { profile: null, org: null, role: null };

  const fetchRole = () =>
    supabase!
      .from('user_roles')
      .select('roles(slug)')
      .eq('user_id', userId)
      .limit(1)
      .single();

  const [profileRes, roleRes] = await Promise.all([
    supabase
      .from('user_profiles')
      .select('id, organization_id, full_name, avatar_url, must_change_password')
      .eq('id', userId)
      .single(),
    fetchRole(),
  ]);

  const profile = profileRes.data as SupabaseProfile | null;
  let roleName = (roleRes.data as { roles: { slug: string } } | null)?.roles?.slug ?? null;

  // Every account with a completed profile should always have a role row
  // by this point (handle_new_user()/setup_invited_user() assign it
  // synchronously before this is ever called) — a null result here has
  // been a transient timing race right after sign-in, not a real "no role
  // yet" state. Retry once rather than let a caller silently treat a
  // failed fetch as "this user has the lowest-privilege role."
  if (!roleName) {
    const retryRes = await fetchRole();
    roleName = (retryRes.data as { roles: { slug: string } } | null)?.roles?.slug ?? null;
  }

  let org: SupabaseOrg | null = null;
  if (profile?.organization_id) {
    const { data } = await supabase
      .from('organizations')
      .select('id, name, slug, plan, logo_url, industry, company_size, trial_ends_at')
      .eq('id', profile.organization_id)
      .single();
    org = data as SupabaseOrg | null;
  }

  return { profile, org, role: roleName };
}
