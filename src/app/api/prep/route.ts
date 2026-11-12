import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { isOwner } from '@/lib/owner';

export const dynamic = 'force-dynamic';

// "Before you go" notes: what Nathan has to book or check before a stop's day.
// They live in koji_stop_prep (RLS on, no policies), never in body_md, so the
// page Dez reads carries none of them. Every verb needs the koji_admin cookie.
//
//   GET   ?trip=<id>                 the trip's notes
//   PATCH { stop_id, done: bool }    tick or untick
//   PUT   { stop_id, prep_md }       write a note ('' removes it)

export async function GET(req: Request) {
  if (!(await isOwner())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const trip = Number(new URL(req.url).searchParams.get('trip'));
  if (!trip) return NextResponse.json({ error: 'trip required' }, { status: 400 });
  const db = supabaseAdmin();
  const { data: days, error: e1 } = await db.from('koji_days').select('id').eq('trip_id', trip);
  if (e1) return NextResponse.json({ error: e1.message }, { status: 500 });
  const { data: stops, error: e2 } = await db.from('koji_stops').select('id').in('day_id', (days ?? []).map(d => d.id));
  if (e2) return NextResponse.json({ error: e2.message }, { status: 500 });
  const { data, error } = await db.from('koji_stop_prep')
    .select('stop_id, prep_md, done_at')
    .in('stop_id', (stops ?? []).map(s => s.id));
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ prep: data ?? [] });
}

export async function PATCH(req: Request) {
  if (!(await isOwner())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const stopId = Number(body.stop_id);
  if (!stopId || typeof body.done !== 'boolean') {
    return NextResponse.json({ error: 'stop_id and done required' }, { status: 400 });
  }
  const { data, error } = await supabaseAdmin().from('koji_stop_prep')
    .update({ done_at: body.done ? new Date().toISOString() : null, updated_at: new Date().toISOString() })
    .eq('stop_id', stopId).select('stop_id, prep_md, done_at').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ prep: data });
}

export async function PUT(req: Request) {
  if (!(await isOwner())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const stopId = Number(body.stop_id);
  const md = typeof body.prep_md === 'string' ? body.prep_md.trim() : null;
  if (!stopId || md == null) return NextResponse.json({ error: 'stop_id and prep_md required' }, { status: 400 });
  const db = supabaseAdmin();
  if (!md) {
    const { error } = await db.from('koji_stop_prep').delete().eq('stop_id', stopId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ prep: null });
  }
  const { data, error } = await db.from('koji_stop_prep')
    .upsert({ stop_id: stopId, prep_md: md, updated_at: new Date().toISOString() })
    .select('stop_id, prep_md, done_at').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ prep: data });
}
