import { notFound } from 'next/navigation';
import { getTripBySlug, getTripPartParams } from '@/lib/supabase';
import { findPart, slicePart } from '@/lib/parts';
import { TripView } from '@/components/TripView';

export const revalidate = 60;

function addDays(iso: string, n: number): string {
  const d = new Date(iso + 'T00:00');
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// One page per part, prerendered like the whole trip. Saved to an iPhone home
// screen from here, the icon opens straight to this part.
export async function generateStaticParams() {
  return getTripPartParams();
}

export default async function TripPartPage({
  params,
}: {
  params: Promise<{ slug: string; part: string }>;
}) {
  const { slug, part: key } = await params;
  const data = await getTripBySlug(slug);
  if (!data) notFound();
  const part = findPart(data.trip, key);
  if (!part) notFound();

  const { trip, logistics, days, stays, reserved } = slicePart(data, part);

  // The first and last lines of a dressed trip (itte kimasu / tadaima) belong
  // to the trip's own first and last days, so a part shows them only if it
  // contains those days.
  const start = data.trip.date_start;
  const lastDate = start ? addDays(start, data.days.length - 1) : null;
  const opensTrip = !!start && part.from <= start;
  const endsTrip = !!lastDate && part.to >= lastDate;

  return (
    <TripView
      trip={trip}
      logistics={logistics}
      days={days}
      stays={stays}
      reserved={reserved}
      part={{ key: part.key, label: part.label, wholeHref: `/trips/${slug}`, opensTrip, endsTrip }}
    />
  );
}
