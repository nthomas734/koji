import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase';

async function authed() {
  const store = await cookies();
  return store.get('koji_admin')?.value === process.env.ADMIN_PASSWORD;
}

export async function POST(req: Request) {
  if (!await authed()) return new NextResponse('Unauthorized', { status: 401 });
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
