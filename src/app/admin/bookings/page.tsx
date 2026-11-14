import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase';
import type { Booking } from '@/lib/bookings';
import { feedToken } from '@/lib/bookingsFeed';
import BookingsBoard, { type BoardTrip } from './BookingsBoard';

export const dynamic = 'force-dynamic';

export default async function BookingsPage() {
  const store = await cookies();
  if (store.get('koji_admin')?.value !== process.env.ADMIN_PASSWORD) redirect('/admin/login');

  const db = supabaseAdmin();
  const [{ data: trips }, { data: rows }] = await Promise.all([
    db.from('koji_trips').select('id, slug, title, subtitle, date_start, date_end, header_theme, tz').order('date_start', { nullsFirst: false }),
    db.from('koji_bookings').select('*').order('opens_on', { nullsFirst: false }).order('sort_order'),
  ]);

  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'koji-iota.vercel.app';
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
  const feedPath = `${host}/api/bookings/ics?k=${feedToken()}`;

  return (
    <BookingsBoard
      initial={(rows ?? []) as Booking[]}
      trips={(trips ?? []) as BoardTrip[]}
      feedHttp={`${proto}://${feedPath}`}
      feedWebcal={`webcal://${feedPath}`}
    />
  );
}
