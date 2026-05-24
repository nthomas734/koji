import { NextRequest, NextResponse } from 'next/server';

// Proxy for Open-Meteo archive API — avoids browser-side timeout issues
// and caches the response at the edge for 24 hours.
export const runtime = 'edge';

const DAILY_FIELDS = [
  'temperature_2m_max',
  'temperature_2m_min',
  'weathercode',
  'windspeed_10m_max',
  'precipitation_sum',
  'uv_index_max',
].join(',');

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const lat   = searchParams.get('lat');
  const lng   = searchParams.get('lng');
  const start = searchParams.get('start');
  const end   = searchParams.get('end');

  if (!lat || !lng || !start || !end) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 });
  }

  const url = new URL('https://archive-api.open-meteo.com/v1/archive');
  url.searchParams.set('latitude',         lat);
  url.searchParams.set('longitude',        lng);
  url.searchParams.set('daily',            DAILY_FIELDS);
  url.searchParams.set('temperature_unit', 'fahrenheit');
  url.searchParams.set('wind_speed_unit',  'mph');
  url.searchParams.set('timezone',         'auto');
  url.searchParams.set('start_date',       start);
  url.searchParams.set('end_date',         end);

  try {
    const res = await fetch(url.toString(), {
      signal: AbortSignal.timeout(25000),
    });
    if (!res.ok) {
      return NextResponse.json({ error: `Archive API ${res.status}` }, { status: 502 });
    }
    const json = await res.json();
    return NextResponse.json(json, {
      headers: {
        // Cache at the edge for 24 hours — historical data never changes
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=3600',
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 504 });
  }
}
