import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase';
import { isMapsLink } from '@/lib/maps';

export const dynamic = 'force-dynamic';

// Verdicts are private, not hidden. Unlike koma — whose reads are public so the
// mode works logged out — every verb here needs the koji_admin cookie, and the
// table has no RLS policies at all. A 401 from GET is also how the trip page
// learns it is *not* being viewed by Nathan, and so draws no stamps.
//
// Writes are upserts on client_key. The phone queues taps while offline and
// replays them later (lib/verdicts.ts), so the same write can arrive twice; the
// key makes the second one a no-op rather than a duplicate place.

const VERDICTS = new Set(['back', 'once', 'skip']);
const SOURCES  = new Set(['stop', 'app', 'share', 'photo']);
const KEY_RE   = /^(stop|x|share|photo):[A-Za-z0-9_-]{1,64}$/;
const NOTE_MAX = 500;
const TITLE_MAX = 200;

const NO_STORE = { 'Cache-Control': 'no-store' };

async function authed() {
  const store = await cookies();
  return store.get('koji_admin')?.value === process.env.ADMIN_PASSWORD;
}

const unauthorized = () => new NextResponse('Unauthorized', { status: 401, headers: NO_STORE });
const bad = (msg: string) => NextResponse.json({ error: msg }, { status: 400 });

export async function GET(req: Request) {
  if (!await authed()) return unauthorized();
  const trip = new URL(req.url).searchParams.get('trip');
  if (!trip) return bad('trip required');

  const { data, error } = await supabaseAdmin()
    .from('koji_verdicts')
    .select('*')
    .eq('trip_id', Number(trip))
    .order('created_at');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ verdicts: data ?? [] }, { headers: NO_STORE });
}

/** Builds the row from a request body, checking every field it takes. */
function rowFrom(body: Record<string, unknown>): { row: Record<string, unknown> } | { error: string } {
  const key = String(body.client_key ?? '');
  if (!KEY_RE.test(key)) return { error: 'client_key is malformed' };

  const tripId = Number(body.trip_id);
  if (!Number.isInteger(tripId) || tripId <= 0) return { error: 'trip_id required' };

  const stopId = body.stop_id == null ? null : Number(body.stop_id);
  if (key.startsWith('stop:') && (stopId == null || key !== `stop:${stopId}`)) {
    return { error: 'a stop verdict must be keyed stop:<stop_id>' };
  }

  const title = String(body.title ?? '').trim();
  if (!title || title.length > TITLE_MAX) return { error: `title required, at most ${TITLE_MAX} characters` };

  const verdict = body.verdict ?? null;
  if (verdict !== null && !VERDICTS.has(String(verdict))) return { error: 'verdict must be back, once, skip or null' };

  const note = body.note == null || body.note === '' ? null : body.note;
  if (note !== null && (typeof note !== 'string' || note.length > NOTE_MAX)) {
    return { error: `note must be a string of at most ${NOTE_MAX} characters` };
  }

  const source = String(body.source ?? (stopId != null ? 'stop' : 'app'));
  if (!SOURCES.has(source)) return { error: 'source is not recognised' };

  const mapsUrl = body.maps_url == null ? null : String(body.maps_url);
  if (mapsUrl && !isMapsLink(mapsUrl)) return { error: 'maps_url must be a Google or Apple Maps link' };

  const visited = body.visited_on == null ? null : String(body.visited_on);
  if (visited && !/^\d{4}-\d{2}-\d{2}$/.test(visited)) return { error: 'visited_on must be YYYY-MM-DD' };

  return {
    row: {
      client_key: key,
      trip_id:    tripId,
      day_id:     body.day_id == null ? null : Number(body.day_id),
      stop_id:    stopId,
      title,
      maps_url:   mapsUrl,
      verdict,
      note,
      source,
      visited_on: visited,
    },
  };
}

export async function PUT(req: Request) {
  if (!await authed()) return unauthorized();
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return bad('body must be JSON'); }

  const built = rowFrom(body ?? {});
  if ('error' in built) return bad(built.error);

  const { data, error } = await supabaseAdmin()
    .from('koji_verdicts')
    .upsert(built.row, { onConflict: 'client_key' })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ verdict: data }, { headers: NO_STORE });
}

export async function DELETE(req: Request) {
  if (!await authed()) return unauthorized();
  const key = new URL(req.url).searchParams.get('key') ?? '';
  if (!KEY_RE.test(key)) return bad('key is malformed');

  const { error } = await supabaseAdmin()
    .from('koji_verdicts')
    .delete()
    .eq('client_key', key);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true }, { headers: NO_STORE });
}
