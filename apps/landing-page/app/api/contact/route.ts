import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { contactFormSchema } from '@/lib/demo-schema';

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = contactFormSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid submission data', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const supabase = await createClient();

  // The contact_messages table does not have phone or type columns.
  // type and phone are prepended to the message body so no data is lost.
  const messageBody = [
    parsed.data.type ? `[${parsed.data.type.toUpperCase()}]` : null,
    parsed.data.phone ? `Phone: ${parsed.data.phone}` : null,
    parsed.data.message,
  ]
    .filter(Boolean)
    .join('\n');

  const { error } = await supabase.from('contact_messages').insert({
    name:    parsed.data.name,
    email:   parsed.data.email,
    subject: parsed.data.subject,
    message: messageBody,
  });

  if (error) {
    console.error('[contact] Supabase insert error:', error.message);
    return NextResponse.json({ error: 'Failed to send message. Please try again.' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
