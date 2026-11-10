// GET /api/bookings/ics?k=<token>[&trip=<slug>] — the booking-window calendar
// feed for Apple Calendar (File → New Calendar Subscription). The token is
// printed on /admin/bookings; see lib/bookingsFeed.
import { supabaseAdmin } from '@/lib/supabase';
import { buildFeed, feedTokenOk } from '@/lib/bookingsFeed';
import type { Booking } from '@/lib/bookings';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = new URL(req.url);
  if (!feedTokenOk(url.searchParams.get('k'))) return new Response('Not found', { status: 404 });
  const db = supabaseAdmin();
  const [{ data: trips, error: te }, { data: rows, error: be }] = await Promise.all([
    db.from('koji_trips').select('id, slug, title'),
    db.from('koji_bookings').select('*').order('opens_on', { nullsFirst: false }).order('sort_order'),
  ]);
  if (te || be) return new Response((te ?? be)!.message, { status: 500 });
  const slug = url.searchParams.get('trip');
  const tripId = slug ? trips?.find(t => t.slug === slug)?.id : undefined;
  const bookings = ((rows ?? []) as Booking[]).filter(b => !slug || b.trip_id === tripId);
  const origin = `${url.protocol}//${url.host}`;
  return new Response(buildFeed(bookings, trips ?? [], origin), {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="koji-bookings.ics"',
      'Cache-Control': 'no-store',
    },
  });
}
