import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { getKomaForTrip, supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// koma is private since 2026-11-11: every verb here needs the koji_admin
// cookie. It used to be "hidden, not locked" — GET and status PATCHes were
// open and the shots shipped inside the public trip page — which put the whole
// shot plan in every shared and part link. See "koma" in CLAUDE.md.
//
//   GET ?trip=   the trip's shots and carry lists. This is how the trip page
//                gets koma now; lib/komaData.ts caches the answer on the
//                owner's phone so koma still opens offline.
//   GET ?roll=   a standalone roll's shots.
//   PATCH        status/status_note (the field write, checked rather than
//                trusted) or any other field (authoring).
//   POST, DELETE authoring.
//
// A 401 on a status PATCH keeps the tap in komaQueue until the cookie is back.

/** Fields the field UI writes. Validated, since they come from a tap. */
const FIELD_WRITABLE = new Set(['status', 'status_note']);

/** The route is open, so the two open fields get checked rather than trusted.
 *  Neither was validated: `status` took any string, and `status_note` took a
 *  document. Nothing writes the note yet, which is the moment to cap it. */
const STATUSES = new Set(['planned', 'got', 'missed', 'skipped']);
const NOTE_MAX = 280;

function rejectBadValues(body: Record<string, unknown>): string | null {
  if ('status' in body && !STATUSES.has(String(body.status))) {
    return `status must be one of ${[...STATUSES].join(', ')}`;
  }
  const note = body.status_note;
  if (note != null && (typeof note !== 'string' || note.length > NOTE_MAX)) {
    return `status_note must be a string of at most ${NOTE_MAX} characters`;
  }
  return null;
}

/**
 * Marking a frame writes to the database, but the trip page is prerendered
 * with `revalidate = 60` — so the next request inside that window is served
 * the *old* payload, `setShots(initialShots)` applies it, and the mark the
 * person just made visibly reverts. It comes back a minute later, which is
 * worse than never showing it: the app appears to have lost the work.
 *
 * Every koma surface is invalidated rather than looked up by slug. There are
 * a handful of trips and two rolls; a query to be precise costs more than the
 * regeneration it would save.
 */
function revalidateKoma() {
  revalidatePath('/trips/[slug]', 'page');
  revalidatePath('/koma/[slug]', 'page');
  revalidatePath('/koma');
}

async function authed() {
  const store = await cookies();
  return store.get('koji_admin')?.value === process.env.ADMIN_PASSWORD;
}

export async function GET(req: Request) {
  if (!await authed()) return new NextResponse('Unauthorized', { status: 401 });
  const { searchParams } = new URL(req.url);
  const trip = searchParams.get('trip');
  const roll = searchParams.get('roll');

  // A frame belongs to exactly one of the two, so the route should answer for
  // either. It took `trip` only, which left rolls reachable through the page
  // but not through the API that exists to serve them.
  if (!trip === !roll) {
    return NextResponse.json({ error: 'exactly one of trip or roll required' }, { status: 400 });
  }

  if (trip) {
    try {
      return NextResponse.json(await getKomaForTrip(Number(trip)));
    } catch (e) {
      return NextResponse.json({ error: (e as Error).message }, { status: 500 });
    }
  }

  const { data, error } = await supabaseAdmin()
    .from('koma_shots')
    .select('*')
    .eq('roll_id', Number(roll))
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

  if (!await authed()) return new NextResponse('Unauthorized', { status: 401 });
  const fieldOnly = keys.every(k => FIELD_WRITABLE.has(k));
  if (fieldOnly) {
    const bad = rejectBadValues(body);
    if (bad) return NextResponse.json({ error: bad }, { status: 400 });
  }

  const { error } = await supabaseAdmin()
    .from('koma_shots')
    .update(body)
    .eq('id', Number(id));
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  revalidateKoma();
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
  revalidateKoma();
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
  revalidateKoma();
  return NextResponse.json({ ok: true });
}
