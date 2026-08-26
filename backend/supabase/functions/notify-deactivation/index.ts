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

function emailHtml(name: string): string {
  return `
<div style="margin:0; padding:0; background-color:#f4f5f7; font-family:'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f5f7; padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px; width:100%; background-color:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 1px 3px rgba(0,0,0,0.08);">
        <tr><td style="background-color:#0038a8; padding:28px 32px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
            <td style="width:36px; vertical-align:middle;">
              <table role="presentation" cellpadding="0" cellspacing="0" style="width:32px; height:32px; background-color:#ffffff; border-radius:8px;"><tr>
                <td align="center" valign="middle" style="width:32px; height:32px; color:#0038a8; font-weight:800; font-size:16px; font-family:'Inter', Arial, sans-serif;">H</td>
              </tr></table>
            </td>
            <td style="vertical-align:middle; padding-left:10px;"><span style="color:#ffffff; font-weight:800; font-size:17px; letter-spacing:0.3px;">HRISPH</span></td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:36px 32px 28px 32px;">
          <p style="margin:0 0 6px 0; font-size:11px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; color:#dc2626;">Account Notice</p>
          <h1 style="margin:0 0 16px 0; font-size:20px; line-height:1.3; font-weight:800; color:#111827;">Your Account Has Been Deactivated</h1>
          <p style="margin:0 0 12px 0; font-size:14px; line-height:1.6; color:#4b5563;">
            Hi ${name},
          </p>
          <p style="margin:0 0 20px 0; font-size:14px; line-height:1.6; color:#4b5563;">
            Your HRISPH account access has been deactivated by an administrator on your team. You will no longer be able
            to sign in. If you believe this was a mistake, please contact your organization's HR administrator directly.
          </p>
        </td></tr>
        <tr><td style="padding:20px 32px 28px 32px; border-top:1px solid #f0f1f3;">
          <p style="margin:0; font-size:12px; line-height:1.6; color:#9ca3af;">This is an automated notice from HRISPH. If you have questions, reach out to your organization's administrator.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</div>`;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(req) });
  }
  if (req.method !== 'POST') return err('Method not allowed', 405, req);

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return err('Unauthorized', 401, req);

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const resendKey   = Deno.env.get('RESEND_API_KEY');

  const adminClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const userClient  = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user: caller }, error: authError } = await userClient.auth.getUser();
  if (authError || !caller) return err('Unauthorized', 401, req);

  let body: { userId?: string };
  try { body = await req.json(); }
  catch { return err('Invalid JSON', 400, req); }

  const { userId } = body;
  if (!userId) return err('userId is required', 400, req);

  // Look up the target's org via their profile — the notification only
  // ever goes to the actual deactivated account, looked up server-side,
  // never a client-supplied email (prevents spoofing an arbitrary recipient).
  const { data: targetProfile, error: targetErr } = await adminClient
    .from('user_profiles')
    .select('organization_id, full_name')
    .eq('id', userId)
    .single();

  if (targetErr || !targetProfile?.organization_id) return err('Target user not found', 404, req);

  // Caller must be a super_admin in that same org
  const { data: membership, error: memErr } = await adminClient
    .from('user_roles')
    .select('roles(slug)')
    .eq('user_id', caller.id)
    .eq('organization_id', targetProfile.organization_id)
    .single();

  if (memErr || !membership) return err('You are not a member of this organization', 403, req);
  const callerSlug = (membership as any).roles?.slug;
  if (callerSlug !== 'super_admin') return err('Only Super Admins can trigger this notification', 403, req);

  const { data: targetAuth, error: targetAuthErr } = await adminClient.auth.admin.getUserById(userId);
  if (targetAuthErr || !targetAuth?.user?.email) return err('Could not resolve target email', 404, req);

  if (!resendKey) {
    // Fail soft and loud in logs, not to the caller — deactivation itself
    // already succeeded via deactivate_member before this is ever called;
    // a missing/unconfigured mail provider shouldn't look like the
    // deactivation itself failed.
    console.error('RESEND_API_KEY not configured — skipping deactivation email');
    return json({ success: false, skipped: true, reason: 'Email provider not configured' }, 200, req);
  }

  const name = targetProfile.full_name || targetAuth.user.email;

  const resendRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendKey}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({
      from:    'HRISPH <onboarding@resend.dev>',
      to:      [targetAuth.user.email],
      subject: 'Your HRISPH Account Has Been Deactivated',
      html:    emailHtml(name),
    }),
  });

  if (!resendRes.ok) {
    const detail = await resendRes.text();
    console.error('Resend send failed:', resendRes.status, detail);
    return json({ success: false, error: 'Failed to send notification email' }, 200, req);
  }

  return json({ success: true }, 200, req);
});
