import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { dinnerState } from '@/lib/dinnerRounds';

export const dynamic = 'force-dynamic';

// Dinner votes are open, like marking a koma frame: the family votes from
// their phones without logging in, picking a name from the trip's `voters`.
// What is checked rather than trusted: the name is on that trip's list, the
// option belongs to the stop, and the dinner is not already booked. Ties go
// to a runoff (see lib/dinnerRounds): only the open round can be voted in, and
// only for an option still in it. Booking
// state itself is never written here.

const noStore = { 'Cache-Control': 'no-store' };

async function votesFor(tripId: number) {
  const { data, error } = await supabaseAdmin()
    .from('koji_dinner_votes')
    .select('stop_id, option_id, voter, round')
    .eq('trip_id', tripId);
  if (error) throw error;
  return data ?? [];
}

export async function GET(req: Request) {
  const trip = Number(new URL(req.url).searchParams.get('trip'));
  if (!Number.isInteger(trip) || trip <= 0) {
    return NextResponse.json({ error: 'trip required' }, { status: 400, headers: noStore });
  }
  try {
    return NextResponse.json({ votes: await votesFor(trip) }, { headers: noStore });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500, headers: noStore });
  }
}

export async function POST(req: Request) {
  let body: { stopId?: unknown; optionId?: unknown; voter?: unknown; round?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'bad json' }, { status: 400 }); }
  const stopId = Number(body.stopId);
  const optionId = body.optionId == null ? null : Number(body.optionId);
  const voter = typeof body.voter === 'string' ? body.voter.trim() : '';
  if (!Number.isInteger(stopId) || (optionId !== null && !Number.isInteger(optionId)) || !voter) {
    return NextResponse.json({ error: 'stopId, optionId and voter required' }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { data: stop } = await db.from('koji_stops').select('id, day_id').eq('id', stopId).maybeSingle();
  if (!stop) return NextResponse.json({ error: 'no such stop' }, { status: 404 });
  const { data: day } = await db.from('koji_days').select('trip_id').eq('id', stop.day_id).maybeSingle();
  const { data: trip } = day
    ? await db.from('koji_trips').select('id, voters, published, vote_weights, dinner_choosers').eq('id', day.trip_id).maybeSingle()
    : { data: null };
  if (!trip?.published) return NextResponse.json({ error: 'no such trip' }, { status: 404 });
  if (!(trip.voters ?? []).includes(voter)) {
    return NextResponse.json({ error: 'not a voter on this trip' }, { status: 403 });
  }

  const { data: options } = await db.from('koji_dinner_options').select('id, status').eq('stop_id', stopId);
  if (!options?.length) return NextResponse.json({ error: 'no vote here' }, { status: 400 });
  if (options.some(o => o.status === 'booked')) {
    return NextResponse.json({ error: 'this dinner is booked' }, { status: 409 });
  }

  const { data: existing } = await db.from('koji_dinner_votes')
    .select('option_id, voter, round').eq('stop_id', stopId);
  // A dinner with a chooser (Mom's birthday dinner) is hers alone to pick
  const chooser: string | undefined = (trip.dinner_choosers ?? {})[String(stopId)];
  if (chooser && voter !== chooser) {
    return NextResponse.json({ error: `only ${chooser} chooses this dinner` }, { status: 403 });
  }
  const state = chooser
    ? dinnerState(options.map(o => o.id), existing ?? [], [chooser])
    : dinnerState(options.map(o => o.id), existing ?? [], trip.voters ?? [], trip.vote_weights ?? {});
  const round = body.round == null ? state.round : Number(body.round);
  if (round !== state.round) {
    return NextResponse.json({ error: round < state.round ? 'that round is closed: there is a runoff now' : 'no such round' }, { status: 409 });
  }

  if (optionId === null) {
    const { error } = await db.from('koji_dinner_votes').delete().eq('stop_id', stopId).eq('voter', voter).eq('round', round);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    if (!options.some(o => o.id === optionId)) {
      return NextResponse.json({ error: 'option is not on this dinner' }, { status: 400 });
    }
    if (!state.eligible.includes(optionId)) {
      return NextResponse.json({ error: 'that place is out of the runoff' }, { status: 409 });
    }
    const { error } = await db.from('koji_dinner_votes').upsert(
      { trip_id: trip.id, stop_id: stopId, option_id: optionId, voter, round, updated_at: new Date().toISOString() },
      { onConflict: 'stop_id,voter,round' },
    );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ votes: await votesFor(trip.id) }, { headers: noStore });
}
