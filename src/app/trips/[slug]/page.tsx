import { notFound } from 'next/navigation';
import { getTripBySlug } from '@/lib/supabase';
import { TripView } from '@/components/TripView';

export const revalidate = 60;

export default async function TripPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await getTripBySlug(slug);
  if (!data) notFound();

  const { trip, logistics, days } = data;

  return <TripView trip={trip} logistics={logistics} days={days} />;
}
