import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ALLOWED_ORIGINS = [
  'https://hrisph.vercel.app',
  'https://adminhrisph.vercel.app',
  'http://localhost:3000',
  'http://localhost:3001',
];

const RATE_LIMIT = 3;

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') ?? '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type, apikey, x-client-info',
  };
}

function jsonResponse(data: unknown, status = 200, req?: Request): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...(req ? getCorsHeaders(req) : {}) },
  });
}

function errorResponse(message: string, status = 400, req?: Request): Response {
  return jsonResponse({ error: message }, status, req);
}

function hashIp(ip: string): string {
  let hash = 0;
  for (let i = 0; i < ip.length; i++) {
    hash = (hash << 5) - hash + ip.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: getCorsHeaders(req) });
  }

  if (req.method !== 'POST') return errorResponse('Method not allowed', 405, req);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return errorResponse('Invalid JSON', 400, req);
  }

  const { email } = body as Record<string, string>;

  if (!email?.trim())    return errorResponse('Email is required', 400, req);
  if (!validateEmail(email)) return errorResponse('Invalid email address', 400, req);

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const ipHash = hashIp(ip);

  await supabase.rpc('clean_rate_limits');

  const { count } = await supabase
    .from('rate_limits')
    .select('*', { count: 'exact', head: true })
    .eq('ip_hash', ipHash)
    .eq('action', 'newsletter')
    .gte('created_at', new Date(Date.now() - 3600_000).toISOString());

  if ((count ?? 0) >= RATE_LIMIT) {
    return errorResponse('Too many requests. Please try again later.', 429, req);
  }

  const normalizedEmail = email.toLowerCase().trim();

  const { data: existing } = await supabase
    .from('newsletter_subscribers')
    .select('id, status')
    .eq('email', normalizedEmail)
    .single();

  if (existing) {
    if (existing.status === 'active') {
      return jsonResponse({ success: true, message: 'Check your inbox to confirm your subscription.' }, 200, req);
    }
    await supabase
      .from('newsletter_subscribers')
      .update({ status: 'pending', unsubscribed_at: null })
      .eq('id', existing.id);
  } else {
    const { error } = await supabase.from('newsletter_subscribers').insert({
      email:   normalizedEmail,
      status:  'pending',
      ip_hash: ipHash,
    });

    if (error) {
      console.error('newsletter insert error:', error);
      return errorResponse('Failed to subscribe. Please try again.', 500, req);
    }
  }

  await supabase.from('rate_limits').insert({ ip_hash: ipHash, action: 'newsletter' });

  return jsonResponse({ success: true, message: 'Check your inbox to confirm your subscription.' }, 200, req);
});
