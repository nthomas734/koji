import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase';
import { BOOKING_FIELDS, effectiveStatus, type Booking } from '@/lib/bookings';

// koji_bookings is private (RLS on, no policies); this route and the calendar
// feed are the only ways in.

async function authed() {
  const store = await cookies();
  return store.get('koji_admin')?.value === process.env.ADMIN_PASSWORD;
}

function pick(body: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const k of BOOKING_FIELDS) {
    if (!(k in body)) continue;
    const v = body[k];
    out[k] = typeof v === 'string' && v.trim() === '' && k !== 'title' ? null : v;
  }
  return out;
}

// GET: how many windows are open and not booked, for the badge in the owner
// switcher on the trip page.
export async function GET() {
  if (!await authed()) return new NextResponse('Unauthorized', { status: 401 });
  const { data, error } = await supabaseAdmin().from('koji_bookings').select('*').in('status', ['not_open', 'open']);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const now = new Date();
  const open = ((data ?? []) as Booking[]).filter(b => effectiveStatus(b, now) === 'open').length;
  return NextResponse.json({ open }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(req: Request) {
  if (!await authed()) return new NextResponse('Unauthorized', { status: 401 });
  const body = pick(await req.json());
  const { data, error } = await supabaseAdmin().from('koji_bookings').insert(body).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ row: data });
}

export async function PATCH(req: Request) {
  if (!await authed()) return new NextResponse('Unauthorized', { status: 401 });
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const body = pick(await req.json());
  const { data, error } = await supabaseAdmin().from('koji_bookings').update(body).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ row: data });
}

export async function DELETE(req: Request) {
  if (!await authed()) return new NextResponse('Unauthorized', { status: 401 });
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const { error } = await supabaseAdmin().from('koji_bookings').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
