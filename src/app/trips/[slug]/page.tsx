import { notFound } from 'next/navigation';
import { getTripBySlug, getTripSlugs } from '@/lib/supabase';
import { TripView } from '@/components/TripView';

export const revalidate = 60;

// Without this the segment cannot be prerendered and `revalidate` does nothing:
// every load ran five sequential Supabase queries and an outage gave an error
// page rather than the last good copy.
export async function generateStaticParams() {
  return (await getTripSlugs()).map(slug => ({ slug }));
}

export default async function TripPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await getTripBySlug(slug);
  if (!data) notFound();

  const { trip, logistics, days, shots, carry } = data;

  return <TripView trip={trip} logistics={logistics} days={days} shots={shots} carry={carry} />;
}
