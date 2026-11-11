import { notFound } from 'next/navigation';
import { getTripBySlug, getTripPartParams } from '@/lib/supabase';
import { findPart, slicePart } from '@/lib/parts';
import { TripView } from '@/components/TripView';

export const revalidate = 60;

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

  const { trip, logistics, days, shots, carry, stays } = slicePart(data, part);

  return (
    <TripView
      trip={trip}
      logistics={logistics}
      days={days}
      shots={shots}
      carry={carry}
      stays={stays}
      part={{ label: part.label, wholeHref: `/trips/${slug}` }}
    />
  );
}
