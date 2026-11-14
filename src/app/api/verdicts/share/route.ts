import { NextResponse } from 'next/server';
import { randomUUID, timingSafeEqual } from 'crypto';
import { supabaseAdmin } from '@/lib/supabase';
import { placeUrl, usesAppleMaps } from '@/lib/maps';

export const dynamic = 'force-dynamic';

// The door for the "Add to koji" iOS Shortcut.
//
// iOS will not list a home-screen web app in the share sheet, so a place found
// in Google Maps reaches koji through a Shortcut instead: Share → Add to koji →
// pick a verdict → this route. The Shortcut cannot carry the admin cookie, so
// it sends a bearer token (KOJI_SHARE_TOKEN in Vercel) and nothing else gets in.
//
// Body (JSON), everything but `date` optional:
//   text     what Google Maps put on the share sheet — usually the place name,
//            sometimes an address line, usually a maps.app.goo.gl link
//   url      the shared link on its own, if the Shortcut split it out
//   name     an explicit place name; wins over anything parsed
//   date     the phone's local date, YYYY-MM-DD. Sent by the phone rather than
//            worked out here so "today" is Japan's today, not Vercel's.
//   verdict  back | once | skip
//   note     private note
//
// The place lands on whichever trip covers `date`, on that day, as a private
// extra. It never becomes a koji_stops row, which would make it public.

const VERDICTS = new Set(['back', 'once', 'skip']);
const DAY_MS = 86_400_000;

function tokenOk(req: Request): boolean {
  const expected = process.env.KOJI_SHARE_TOKEN;
  if (!expected) return false;
  const got = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  const a = Buffer.from(got);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

const URL_RE = /https?:\/\/\S+/;

/**
 * Google's short links redirect to /maps/place/<Name>/@lat,lng… — the only
 * place the name lives when the share text is a bare link. Followed by hand
 * with a short timeout; failing to name the place is not worth failing the save.
 */
async function nameFromLink(link: string): Promise<string | null> {
  let url = link;
  for (let hop = 0; hop < 4; hop++) {
    const m = url.match(/\/maps\/place\/([^/@?]+)/);
    if (m) return decodeURIComponent(m[1].replace(/\+/g, ' ')).trim() || null;
    let res: Response;
    try {
      res = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(4000) });
    } catch {
      return null;
    }
    const next = res.headers.get('location');
    if (!next) return null;
    url = new URL(next, url).toString();
  }
  return null;
}

function nameFromText(text: string): string | null {
  const line = text
    .split(/\r?\n/)
    .map(s => s.trim())
    .find(s => s && !URL_RE.test(s));
  return line ? line.slice(0, 200) : null;
}

export async function POST(req: Request) {
  if (!process.env.KOJI_SHARE_TOKEN) {
    return NextResponse.json({ error: 'KOJI_SHARE_TOKEN is not set in Vercel' }, { status: 503 });
  }
  if (!tokenOk(req)) return new NextResponse('Unauthorized', { status: 401 });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'body must be JSON' }, { status: 400 }); }

  const date = String(body.date ?? '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'date must be YYYY-MM-DD' }, { status: 400 });
  }

  const verdict = body.verdict == null || body.verdict === '' ? null : String(body.verdict);
  if (verdict && !VERDICTS.has(verdict)) {
    return NextResponse.json({ error: 'verdict must be back, once or skip' }, { status: 400 });
  }
  const note = body.note == null || body.note === '' ? null : String(body.note).slice(0, 500);

  const text = String(body.text ?? '');
  const link = String(body.url ?? '').match(URL_RE)?.[0] ?? text.match(URL_RE)?.[0] ?? null;

  const name = (typeof body.name === 'string' && body.name.trim())
    || nameFromText(text)
    || (link ? await nameFromLink(link) : null);
  if (!name) {
    return NextResponse.json({ error: 'could not tell which place this is — share it with its name' }, { status: 400 });
  }

  // The trip that covers this date. Drafts count: a trip does not have to be
  // published for Nathan to be on it.
  const db = supabaseAdmin();
  const { data: trips, error: tErr } = await db
    .from('koji_trips')
    .select('id, slug, location, date_start, date_end, tz')
    .lte('date_start', date)
    .order('date_start', { ascending: false })
    .limit(5);
  if (tErr) return NextResponse.json({ error: tErr.message }, { status: 500 });

  const trip = (trips ?? []).find(t => (t.date_end ?? t.date_start) >= date);
  if (!trip) {
    return NextResponse.json({ error: `no koji trip covers ${date}` }, { status: 404 });
  }

  // Day i is date_start + i (koji stores no per-day date; see dateForDay).
  const { data: days } = await db
    .from('koji_days')
    .select('id, label, location_label, sort_order')
    .eq('trip_id', trip.id)
    .order('sort_order');
  const idx = Math.round((Date.parse(date) - Date.parse(trip.date_start)) / DAY_MS);
  const day = (days ?? [])[idx] ?? null;

  const city = day?.location_label ?? trip.location ?? null;

  const { data, error } = await db
    .from('koji_verdicts')
    .insert({
      client_key: `share:${randomUUID()}`,
      trip_id:    trip.id,
      day_id:     day?.id ?? null,
      stop_id:    null,
      title:      name,
      maps_url:   placeUrl(usesAppleMaps(trip.tz), name, city),
      source_url: link,
      verdict,
      note,
      source:     'share',
      visited_on: date,
    })
    .select('id, title')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Plain sentence first: the Shortcut shows this as its notification.
  return NextResponse.json({
    message: `Added ${data.title} to ${day ? `day ${idx + 1}` : 'the trip'}`,
    id: data.id,
    trip: trip.slug,
  });
}
