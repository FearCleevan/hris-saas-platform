import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ALLOWED_ORIGINS = [
  'https://hrisph.vercel.app',
  'https://adminhrisph.vercel.app',
  'http://localhost:3000',
  'http://localhost:3001',
];

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') ?? '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
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

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: getCorsHeaders(req) });
  }

  if (req.method !== 'POST' && req.method !== 'GET') {
    return errorResponse('Method not allowed', 405, req);
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  let token: string | null = null;

  if (req.method === 'GET') {
    token = new URL(req.url).searchParams.get('token');
  } else {
    try {
      const body = await req.json() as Record<string, string>;
      token = body.token ?? null;
    } catch {
      return errorResponse('Invalid JSON', 400, req);
    }
  }

  if (!token?.trim()) return errorResponse('Unsubscribe token is required', 400, req);

  const { data: subscriber, error: findError } = await supabase
    .from('newsletter_subscribers')
    .select('id, status')
    .eq('unsubscribe_token', token.trim())
    .single();

  if (findError || !subscriber) {
    return errorResponse('Invalid or expired unsubscribe link', 404, req);
  }

  if (subscriber.status === 'unsubscribed') {
    return jsonResponse({ success: true, message: 'You are already unsubscribed.' }, 200, req);
  }

  const { error: updateError } = await supabase
    .from('newsletter_subscribers')
    .update({ status: 'unsubscribed', unsubscribed_at: new Date().toISOString() })
    .eq('id', subscriber.id);

  if (updateError) {
    console.error('unsubscribe update error:', updateError);
    return errorResponse('Failed to unsubscribe. Please try again.', 500, req);
  }

  return jsonResponse({ success: true, message: 'You have been unsubscribed successfully.' }, 200, req);
});
