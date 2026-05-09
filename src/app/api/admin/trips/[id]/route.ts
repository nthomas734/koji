import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase';

function authed() {
  const store = cookies();
  return store.get('koji_admin')?.value === process.env.ADMIN_PASSWORD;
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  if (!authed()) return new NextResponse('Unauthorized', { status: 401 });
  const body = await req.json();
  const sb = supabaseAdmin();
  const { error } = await sb
    .from('koji_trips')
    .update(body)
    .eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  if (!authed()) return new NextResponse('Unauthorized', { status: 401 });
  const sb = supabaseAdmin();
  const { error } = await sb.from('koji_trips').delete().eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
