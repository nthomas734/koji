import { cookies } from 'next/headers';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';
import type { Trip, Day, Stop, Logistics } from '@/lib/supabase';
import TripEditor from './TripEditor';

export default async function AdminTripPage({ params }: { params: Promise<{ id: string }> }) {
  const store = cookies();
  const authed = store.get('koji_admin')?.value === process.env.ADMIN_PASSWORD;
  if (!authed) redirect('/admin/login');

  const { id: idStr } = await params;
  const sb = supabaseAdmin();
  const id = parseInt(idStr);

  const { data: trip, error } = await sb
    .from('koji_trips')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !trip) notFound();

  const { data: logistics } = await sb
    .from('koji_logistics')
    .select('*')
    .eq('trip_id', id)
    .order('column_key')
    .order('sort_order');

  const { data: days } = await sb
    .from('koji_days')
    .select('*, stops:koji_stops(*)')
    .eq('trip_id', id)
    .order('sort_order')
    .order('sort_order', { referencedTable: 'koji_stops' });

  return (
    <TripEditor
      trip={trip as Trip}
      logistics={(logistics ?? []) as Logistics[]}
      days={(days as Day[]) ?? []}
    />
  );
}
