import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { isOwner } from '@/lib/owner';

export const dynamic = 'force-dynamic';

// Book ahead rows (koji_logistics.column_key = 'book') are Nathan's to-do list:
// "Ask Dez: …", what's not booked yet. The public read policy excludes them and
// the prerendered page never carries them; the owner's phone loads them here.
export async function GET(req: Request) {
  if (!(await isOwner())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const trip = Number(new URL(req.url).searchParams.get('trip'));
  if (!trip) return NextResponse.json({ error: 'trip required' }, { status: 400 });
  const { data, error } = await supabaseAdmin().from('koji_logistics')
    .select('*').eq('trip_id', trip).eq('column_key', 'book').order('sort_order');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ rows: data ?? [] });
}
