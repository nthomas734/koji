import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase';

// koma_shots has RLS on with no policies, so this route is the only way in.
// A 401 here is also what tells the client not to offer the koma toggle at all.

async function authed() {
  const store = await cookies();
  return store.get('koji_admin')?.value === process.env.ADMIN_PASSWORD;
}

export async function GET(req: Request) {
  if (!await authed()) return new NextResponse('Unauthorized', { status: 401 });
  const { searchParams } = new URL(req.url);
  const trip = searchParams.get('trip');
  if (!trip) return NextResponse.json({ error: 'trip required' }, { status: 400 });

  const { data, error } = await supabaseAdmin()
    .from('koma_shots')
    .select('*')
    .eq('trip_id', Number(trip))
    .order('sort_order');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ shots: data ?? [] });
}

export async function POST(req: Request) {
  if (!await authed()) return new NextResponse('Unauthorized', { status: 401 });
  const body = await req.json();
  const { data, error } = await supabaseAdmin()
    .from('koma_shots')
    .insert(body)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ shot: data });
}

export async function PATCH(req: Request) {
  if (!await authed()) return new NextResponse('Unauthorized', { status: 401 });
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const body = await req.json();
  const { error } = await supabaseAdmin()
    .from('koma_shots')
    .update(body)
    .eq('id', Number(id));
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  if (!await authed()) return new NextResponse('Unauthorized', { status: 401 });
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const { error } = await supabaseAdmin()
    .from('koma_shots')
    .delete()
    .eq('id', Number(id));
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
