import { notFound } from 'next/navigation';
import { getRollBySlug, getRollSlugs } from '@/lib/supabase';
import { RollView } from './RollView';

export const revalidate = 60;

export async function generateStaticParams() {
  return (await getRollSlugs()).map(slug => ({ slug }));
}

export default async function RollPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await getRollBySlug(slug);
  if (!data) notFound();

  return <RollView roll={data.roll} shots={data.shots} carry={data.carry} />;
}
