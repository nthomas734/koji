import { notFound, redirect } from 'next/navigation';
import { getRollBySlug } from '@/lib/supabase';
import { isOwner } from '@/lib/owner';
import { RollView } from './RollView';

// Owner only since 2026-11-11: per request, behind the cookie. See CLAUDE.md.
export const dynamic = 'force-dynamic';

export default async function RollPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  if (!await isOwner()) redirect('/admin/login');
  const { slug } = await params;
  const data = await getRollBySlug(slug);
  if (!data) notFound();

  return <RollView roll={data.roll} shots={data.shots} carry={data.carry} />;
}
