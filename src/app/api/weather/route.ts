import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const revalidate = 86400;
// A China-sized batch is ~95 upstream calls six at a time: a few seconds.
export const maxDuration = 30;

const DAILY_FIELDS = [
  'temperature_2m_max',
  'temperature_2m_min',
  'weathercode',
  'windspeed_10m_max',
  'precipitation_sum',
  'uv_index_max',
].join(',');

// archive-api.open-meteo.com is unreachable from Vercel's network.
// historical-forecast-api.open-meteo.com serves the same data and works.
const HISTORICAL_BASE = 'https://historical-forecast-api.open-meteo.com/v1/forecast';

const CACHE_DAY = 'public, s-maxage=86400, stale-while-revalidate=3600';

/** Most items one batch may carry. TripView splits anything larger. */
const MAX_ITEMS = 150;
/** Open-Meteo answers "Too many concurrent requests" past a handful at once
 *  (55 of 70 failed when a batch went all at once). Six is about what one
 *  phone used to send. */
const CONCURRENCY = 6;

function upstreamUrl(lat: string, lng: string, start: string, end: string): string {
  const url = new URL(HISTORICAL_BASE);
  url.searchParams.set('latitude',         lat);
  url.searchParams.set('longitude',        lng);
  url.searchParams.set('daily',            DAILY_FIELDS);
  url.searchParams.set('temperature_unit', 'fahrenheit');
  url.searchParams.set('wind_speed_unit',  'mph');
  url.searchParams.set('timezone',         'auto');
  url.searchParams.set('start_date',       start);
  url.searchParams.set('end_date',         end);
  return url.toString();
}

const NUM  = /^-?\d+(\.\d+)?$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

type BatchResult = { daily: unknown } | { error: string; transient: boolean };

/**
 * Batch mode: `?q=lat,lng,start,end;lat,lng,start,end;…`. The seasonal
 * averages need one range per location per past year (70 for Japan 2027, 95
 * for China 2027); the phone used to send each as its own request. Now it
 * sends one, and this makes exactly the same upstream calls side by side and
 * returns each `daily` block in the order asked. Item failures are per item,
 * as they were per request.
 */
async function batch(q: string) {
  const items = q.split(';').filter(Boolean).map(s => s.split(','));
  if (items.length === 0 || items.length > MAX_ITEMS
    || items.some(p => p.length !== 4 || !NUM.test(p[0]) || !NUM.test(p[1]) || !DATE.test(p[2]) || !DATE.test(p[3]))) {
    return NextResponse.json({ error: 'Bad q' }, { status: 400 });
  }
  const one = async ([lat, lng, start, end]: string[]): Promise<BatchResult> => {
    for (let attempt = 0; ; attempt++) {
      try {
        const res = await fetch(upstreamUrl(lat, lng, start, end), { signal: AbortSignal.timeout(15000) });
        if (res.ok) return { daily: (await res.json()).daily ?? null };
        const body = await res.text();
        const busy = res.status === 429 || /too many/i.test(body);
        if (busy && attempt < 2) { await new Promise(r => setTimeout(r, 500 * (attempt + 1))); continue; }
        return { error: body, transient: busy || res.status >= 500 };
      } catch (err) {
        return { error: err instanceof Error ? err.message : String(err), transient: true };
      }
    }
  };
  const results: BatchResult[] = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, items.length) }, async () => {
    while (next < items.length) { const i = next++; results[i] = await one(items[i]); }
  }));
  // Cache at the edge for a day unless something failed for a passing reason
  // (timeout, 5xx, rate limit after retries). An out-of-range date is a 400 and stays one
  // all day, so it doesn't stop the rest being cached.
  const transient = results.some(r => 'transient' in r && r.transient);
  return NextResponse.json({ results }, {
    headers: { 'Cache-Control': transient ? 'no-store' : CACHE_DAY },
  });
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const q = searchParams.get('q');
  if (q != null) return batch(q);

  const lat   = searchParams.get('lat');
  const lng   = searchParams.get('lng');
  const start = searchParams.get('start');
  const end   = searchParams.get('end');

  if (!lat || !lng || !start || !end) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 });
  }

  try {
    const res = await fetch(upstreamUrl(lat, lng, start, end));
    if (!res.ok) {
      const body = await res.text();
      return NextResponse.json({ error: body }, { status: 502 });
    }
    const json = await res.json();
    return NextResponse.json(json, {
      headers: {
        'Cache-Control': CACHE_DAY,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 504 });
  }
}
