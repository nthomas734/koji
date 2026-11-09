import { NextResponse } from 'next/server';
import { supabase, type Shot } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// ─────────────────────────────────────────────────────────────────────────────
// A trip's frames as a KML file, for Google My Maps.
//
// In the field the frames were read from the app least of all: finding the
// standing point meant leaving koji for Maps, coming back for the direction,
// and working out north — impossible with a group in tow. The trip that worked
// was the one where the photo spots were simply pins in Google Maps, next to
// everything else. So this hands the frames to the app that is already open.
//
// Import at mymaps.google.com (Create a new map → Import). The map then shows
// in the Google Maps app under Saved → Maps.
//
// Only frames with a standing point are exported. A venue-level guess is the
// exact slop the lat/lng column exists to remove, so a frame without one is
// left out and counted in the map's description rather than pinned somewhere
// confident and wrong.
// ─────────────────────────────────────────────────────────────────────────────

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Markdown to plain text, enough for a pin note. */
const plain = (md: string | null) =>
  (md ?? '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*_`#>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const COMPASS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
const compass = (deg: number) => COMPASS[Math.round(((deg % 360) + 360) % 360 / 45) % 8];

/** 17:15 → 5:15pm. Anything else passes through. */
function clock(t: string | null) {
  const m = t?.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return t ?? '';
  const h = Number(m[1]);
  return `${h % 12 || 12}:${m[2]}${h < 12 ? 'am' : 'pm'}`;
}

/** My Maps keeps the icon colour from the style. Priority is the only thing
 *  worth seeing from across the map. aabbggrr, as KML wants it. */
const STYLES: Record<string, string> = { must: 'ff013cb8', want: 'ff216acf', maybe: 'ff9aa39c' };

function placemark(s: Shot) {
  const head = [clock(s.at_time), s.priority, s.lens, s.focal_hint && `@ ${s.focal_hint}`]
    .filter(Boolean).join(' · ');
  const lines = [
    head,
    plain(s.subtitle),
    plain(s.position_md),
    s.bearing != null ? `Face ${compass(s.bearing)} (${Math.round(s.bearing)}°).` : '',
    plain(s.tech_md),
  ].filter(Boolean);
  return `
    <Placemark>
      <name>${esc(s.title)}</name>
      <styleUrl>#${s.priority}</styleUrl>
      <description>${esc(lines.join('\n\n'))}</description>
      <Point><coordinates>${s.lng},${s.lat},0</coordinates></Point>
    </Placemark>`;
}

export async function GET(req: Request) {
  const slug = new URL(req.url).searchParams.get('trip');
  if (!slug) return NextResponse.json({ error: 'trip is required' }, { status: 400 });

  const { data: trip } = await supabase
    .from('koji_trips').select('id, title, slug').eq('slug', slug).maybeSingle();
  if (!trip) return NextResponse.json({ error: 'no such trip' }, { status: 404 });

  const [{ data: days }, { data: shots }] = await Promise.all([
    supabase.from('koji_days').select('id, label, sort_order').eq('trip_id', trip.id).order('sort_order'),
    supabase.from('koma_shots').select('*').eq('trip_id', trip.id)
      .neq('status', 'skipped').order('sort_order'),
  ]);

  const all = (shots ?? []) as Shot[];
  const pinned = all.filter(s => s.lat != null && s.lng != null);
  const unpinned = all.length - pinned.length;

  // One folder per day, in trip order, so My Maps shows them as layers in the
  // order you will meet them. Within a day, by time.
  const byTime = (a: Shot, b: Shot) => (a.at_time ?? '99').localeCompare(b.at_time ?? '99');
  const folders = (days ?? [])
    .map(d => ({ label: d.label as string, shots: pinned.filter(s => s.day_id === d.id).sort(byTime) }))
    .filter(f => f.shots.length);
  const loose = pinned.filter(s => !(days ?? []).some(d => d.id === s.day_id));
  if (loose.length) folders.push({ label: 'Anytime', shots: loose.sort(byTime) });

  const note = unpinned
    ? `${pinned.length} frames. ${unpinned} more have no standing point yet and are only in koji.`
    : `${pinned.length} frames.`;

  const kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${esc(`${trip.title} · photo spots`)}</name>
    <description>${esc(note)}</description>
    ${Object.entries(STYLES).map(([k, c]) =>
      `<Style id="${k}"><IconStyle><color>${c}</color></IconStyle></Style>`).join('\n    ')}
    ${folders.map(f => `
    <Folder>
      <name>${esc(f.label)}</name>${f.shots.map(placemark).join('')}
    </Folder>`).join('')}
  </Document>
</kml>
`;

  return new NextResponse(kml, {
    headers: {
      'Content-Type': 'application/vnd.google-earth.kml+xml; charset=utf-8',
      'Content-Disposition': `attachment; filename="${trip.slug}-photo-spots.kml"`,
      'Cache-Control': 'no-store',
    },
  });
}
