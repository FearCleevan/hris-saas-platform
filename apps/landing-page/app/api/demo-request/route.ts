import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { demoFormSchema } from '@/lib/demo-schema';

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = demoFormSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid submission data', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const supabase = await createClient();

  const { error } = await supabase.from('demo_requests').insert({
    name:           `${parsed.data.firstName} ${parsed.data.lastName}`,
    email:          parsed.data.email,
    phone:          parsed.data.phone,
    company:        parsed.data.company,
    company_size:   parsed.data.companySize,
    industry:       parsed.data.industry,
    preferred_date: parsed.data.preferredDate,
    // preferred_time + message stored together in notes (not separate columns in schema)
    notes: [
      parsed.data.preferredTime ? `Preferred time: ${parsed.data.preferredTime} PHT` : null,
      parsed.data.message ?? null,
    ]
      .filter(Boolean)
      .join('\n') || null,
  });

  if (error) {
    console.error('[demo-request] Supabase insert error:', error.message);
    return NextResponse.json({ error: 'Failed to save request. Please try again.' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
