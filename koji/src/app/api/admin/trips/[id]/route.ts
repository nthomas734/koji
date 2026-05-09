import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase';

async function authed() {
  const store = await cookies();
  return store.get('koji_admin')?.value === process.env.ADMIN_PASSWORD;
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await authed()) return new NextResponse('Unauthorized', { status: 401 });
  const { id } = await params;
  const body = await req.json();
  const sb = supabaseAdmin();
  const { error } = await sb
    .from('koji_trips')
    .update(body)
    .eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await authed()) return new NextResponse('Unauthorized', { status: 401 });
  const { id } = await params;
  const sb = supabaseAdmin();
  const { error } = await sb.from('koji_trips').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
