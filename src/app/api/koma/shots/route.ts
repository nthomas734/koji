import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// koma is hidden, not locked — the same call daizu makes for /barista. But
// "hidden" applies to the entrance, not to every verb on a public URL:
//
//   GET, PATCH(status)  open  — marking a frame "got" has to work in the
//                              street, on a phone that may not be logged in
//   PATCH(anything else),
//   POST, DELETE        admin — authoring. There is no field reason to create
//                              or destroy a shot from a browser, and an
//                              unauthenticated DELETE on a public route is a
//                              wipe-the-plan-before-the-trip button.
//
// Reads for the app itself don't come through here at all; the shots ship with
// the trip page under a public RLS policy so koma works offline from the SW
// cache. This route is for status writes and for authoring.

/** Fields the field UI is allowed to write without being logged in. */
const FIELD_WRITABLE = new Set(['status', 'status_note']);

async function authed() {
  const store = await cookies();
  return store.get('koji_admin')?.value === process.env.ADMIN_PASSWORD;
}

export async function GET(req: Request) {
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

export async function PATCH(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const body = await req.json();
  const keys = Object.keys(body ?? {});
  if (!keys.length) return NextResponse.json({ error: 'nothing to update' }, { status: 400 });

  // Anything beyond a status change is authoring, and needs the cookie.
  if (!keys.every(k => FIELD_WRITABLE.has(k)) && !await authed()) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const { error } = await supabaseAdmin()
    .from('koma_shots')
    .update(body)
    .eq('id', Number(id));
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
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
