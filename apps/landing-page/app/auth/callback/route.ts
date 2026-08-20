import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Handles the OAuth and magic-link callback from Supabase Auth.
// After email confirmation, Supabase redirects here with a code param.
// We exchange the code for a session, then redirect to the admin dashboard.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const rawNext = searchParams.get('next') ?? '/';

  // Reject anything that isn't a safe relative path to prevent open redirects
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const adminUrl = process.env.NEXT_PUBLIC_ADMIN_URL ?? 'https://adminhrisph.vercel.app';
      return NextResponse.redirect(`${adminUrl}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
