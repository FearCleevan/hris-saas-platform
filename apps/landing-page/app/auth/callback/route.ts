import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Handles the OAuth and magic-link callback from Supabase Auth.
// After email confirmation, Supabase redirects here with a code param.
// We exchange the code for a session, then redirect to the admin dashboard.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Redirect to admin dashboard after successful email confirmation
      const adminUrl = process.env.NEXT_PUBLIC_ADMIN_URL ?? 'https://adminhrisph.vercel.app';
      return NextResponse.redirect(`${adminUrl}${next}`);
    }
  }

  // Auth error — redirect back to login with error param
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
