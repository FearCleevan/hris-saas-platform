import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ── CORS ──────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = [
  'https://hrisph.vercel.app',
  'https://adminhrisph.vercel.app',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
];

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') ?? '';
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin':  allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type, apikey, x-client-info',
    'Access-Control-Max-Age':       '86400',
  };
}

function json(data: unknown, status = 200, req?: Request): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...(req ? corsHeaders(req) : {}) },
  });
}

function err(message: string, status = 400, req?: Request): Response {
  return json({ error: message }, status, req);
}

// ── Handler ───────────────────────────────────────────────────────
const VALID_ROLES = ['super_admin', 'hr_manager', 'hr_staff', 'accountant'];

Deno.serve(async (req: Request) => {
  // Preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(req) });
  }

  if (req.method !== 'POST') return err('Method not allowed', 405, req);

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return err('Unauthorized', 401, req);

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;

  // Admin client — needs service role to call auth.admin.inviteUserByEmail
  const adminClient = createClient(
    supabaseUrl,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // User client — validates the caller's JWT (respects RLS)
  const userClient = createClient(
    supabaseUrl,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );

  // Identify the caller
  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) return err('Unauthorized', 401, req);

  // Parse body
  let body: { email?: string; role?: string; organizationId?: string };
  try { body = await req.json(); }
  catch { return err('Invalid JSON', 400, req); }

  const { email, role, organizationId } = body;

  if (!email?.trim())               return err('email is required', 400, req);
  if (!role)                        return err('role is required', 400, req);
  if (!organizationId)              return err('organizationId is required', 400, req);
  if (!VALID_ROLES.includes(role))  return err('Invalid role', 400, req);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return err('Invalid email address', 400, req);

  // Verify caller is super_admin in the target organization
  const { data: membership, error: memErr } = await adminClient
    .from('user_roles')
    .select('roles(slug)')
    .eq('user_id', user.id)
    .eq('organization_id', organizationId)
    .single();

  if (memErr || !membership) return err('You are not a member of this organization', 403, req);

  const callerSlug = (membership as any).roles?.slug;
  if (callerSlug !== 'super_admin') return err('Only Super Admins can invite members', 403, req);

  // Block duplicate pending invites
  const { data: existing } = await adminClient
    .from('invite_tokens')
    .select('id')
    .eq('email', email.toLowerCase().trim())
    .eq('organization_id', organizationId)
    .is('accepted_at', null)
    .maybeSingle();

  if (existing) return err('A pending invitation already exists for this email', 409, req);

  // Resolve role ID within this organization (roles are org-scoped)
  const { data: roleRow, error: roleErr } = await adminClient
    .from('roles')
    .select('id')
    .eq('slug', role)
    .eq('organization_id', organizationId)
    .single();

  if (roleErr || !roleRow) return err('Role not found', 404, req);

  // Get org name for response
  const { data: org } = await adminClient
    .from('organizations')
    .select('name')
    .eq('id', organizationId)
    .single();

  // Build redirect URL — invitee lands here after clicking the email link
  const adminUrl = Deno.env.get('ADMIN_URL') ?? 'http://localhost:3001';
  const redirectTo = `${adminUrl}/auth/callback`;

  // Send the invitation email via Supabase Auth
  const { error: inviteErr } = await adminClient.auth.admin.inviteUserByEmail(
    email.toLowerCase().trim(),
    {
      redirectTo,
      data: {
        role_slug:       role,
        organization_id: organizationId,
        invited_by:      user.id,
      },
    },
  );

  if (inviteErr) {
    console.error('inviteUserByEmail:', inviteErr);
    return err(inviteErr.message || 'Failed to send invitation', 500, req);
  }

  // Track invite in invite_tokens for the pending invitations UI
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  await adminClient.from('invite_tokens').insert({
    email:           email.toLowerCase().trim(),
    organization_id: organizationId,
    role_id:         (roleRow as any).id,
    created_by:      user.id,
    expires_at:      expiresAt,
  });

  return json({
    success:          true,
    message:          `Invitation sent to ${email}`,
    email:            email.toLowerCase().trim(),
    role,
    organizationId,
    organizationName: (org as any)?.name ?? '',
    expiresAt,
  }, 200, req);
});
