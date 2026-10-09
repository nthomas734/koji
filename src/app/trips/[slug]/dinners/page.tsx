import { notFound } from 'next/navigation';
import { getTripBySlug, getTripSlugs } from '@/lib/supabase';
import { DinnerBoard, type DinnerEntry } from '@/components/DinnerVote';

export const revalidate = 60;

export async function generateStaticParams() {
  return (await getTripSlugs()).map(slug => ({ slug }));
}

export default async function DinnersPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getTripBySlug(slug);
  if (!data) notFound();
  const { trip, days } = data;

  const dinners: DinnerEntry[] = days.flatMap(d =>
    (d.stops ?? []).filter(st => st.options?.length).map(stop => ({ stop, dayLabel: d.label, place: d.location_label ?? '' })),
  );
  if (!dinners.length) notFound();

  return (
    <DinnerBoard
      tripId={trip.id}
      tripTitle={trip.title}
      slug={trip.slug}
      voters={trip.voters ?? []}
      weights={trip.vote_weights ?? {}}
      choosers={trip.dinner_choosers ?? {}}
      dinners={dinners}
    />
  );
}
