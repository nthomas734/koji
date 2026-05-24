import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const revalidate = 86400;

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

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const lat   = searchParams.get('lat');
  const lng   = searchParams.get('lng');
  const start = searchParams.get('start');
  const end   = searchParams.get('end');

  if (!lat || !lng || !start || !end) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 });
  }

  const url = new URL(HISTORICAL_BASE);
  url.searchParams.set('latitude',         lat);
  url.searchParams.set('longitude',        lng);
  url.searchParams.set('daily',            DAILY_FIELDS);
  url.searchParams.set('temperature_unit', 'fahrenheit');
  url.searchParams.set('wind_speed_unit',  'mph');
  url.searchParams.set('timezone',         'auto');
  url.searchParams.set('start_date',       start);
  url.searchParams.set('end_date',         end);

  try {
    const res = await fetch(url.toString());
    if (!res.ok) {
      const body = await res.text();
      return NextResponse.json({ error: body }, { status: 502 });
    }
    const json = await res.json();
    return NextResponse.json(json, {
      headers: {
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=3600',
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 504 });
  }
}
