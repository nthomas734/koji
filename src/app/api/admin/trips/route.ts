import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase';

function authed() {
  const store = cookies();
  return store.get('koji_admin')?.value === process.env.ADMIN_PASSWORD;
}

export async function POST(req: Request) {
  if (!authed()) return new NextResponse('Unauthorized', { status: 401 });
  const body = await req.json();
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from('koji_trips')
    .insert(body)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ trip: data });
}
