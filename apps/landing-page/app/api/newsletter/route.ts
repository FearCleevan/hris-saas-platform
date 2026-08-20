import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const schema = z.object({
  email: z.email('Please enter a valid email address'),
});

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
  }

  const supabase = await createClient();

  const { error } = await supabase.from('newsletter_subscribers').insert({
    email:         parsed.data.email,
    status:        'active',
    subscribed_at: new Date().toISOString(),
  });

  if (error) {
    // Unique constraint — already subscribed, treat as success
    if (error.code === '23505') {
      return NextResponse.json({ success: true });
    }
    console.error('[newsletter] Supabase insert error:', error.message);
    return NextResponse.json({ error: 'Failed to subscribe. Please try again.' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
