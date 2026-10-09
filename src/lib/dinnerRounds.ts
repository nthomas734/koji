// ── DINNER ROUNDS ───────────────────────────────────────────────────────────
// Shared by the vote route (which enforces it) and the page (which draws it).
// Round 1 is every option. When everyone on the trip has voted in a round and
// two or more options share the top total, the next round is a runoff between
// just those options. Earlier rounds are then closed. A round where every
// option is still tied cannot be narrowed, so it is reported as a deadlock.
//
// Votes can carry a weight per person (koji_trips.vote_weights). Mom's 70th
// gives Mom 1.5: she wins a 2-2 split she is part of and a fully split vote,
// but never outvotes two people who agree. `tiebreak` marks a result the
// weight decided, so the page can say so rather than show a 2-2 as "decided".

export type RoundVote = { option_id: number; voter: string; round: number };

export type RoundHistory = { round: number; counts: Record<number, number>; raw: Record<number, number> };

export type RoundState = {
  round: number;
  eligible: number[];
  counts: Record<number, number>;
  raw: Record<number, number>;
  complete: boolean;
  leaders: number[];
  winner: number | null;
  /** The weights, not the headcount, separated the leader from the rest. */
  tiebreak: boolean;
  deadlock: boolean;
  history: RoundHistory[];
};

export function dinnerState(
  optionIds: number[],
  votes: RoundVote[],
  voters: string[],
  weights: Record<string, number> = {},
): RoundState {
  const people = new Set(voters);
  const w = (name: string) => (typeof weights[name] === 'number' && weights[name] > 0 ? weights[name] : 1);
  let eligible = [...optionIds];
  let round = 1;
  const history: RoundHistory[] = [];
  for (;;) {
    const rv = votes.filter(v => v.round === round && people.has(v.voter) && eligible.includes(v.option_id));
    const counts: Record<number, number> = {};
    const raw: Record<number, number> = {};
    for (const id of eligible) { counts[id] = 0; raw[id] = 0; }
    for (const v of rv) { counts[v.option_id] += w(v.voter); raw[v.option_id] += 1; }
    const complete = people.size > 0 && new Set(rv.map(v => v.voter)).size >= people.size;
    const max = Math.max(0, ...eligible.map(id => counts[id]));
    const leaders = max > 0 ? eligible.filter(id => counts[id] === max) : [];
    if (complete && leaders.length > 1 && leaders.length < eligible.length && round < 9) {
      history.push({ round, counts, raw });
      eligible = leaders;
      round += 1;
      continue;
    }
    const rawMax = Math.max(0, ...eligible.map(id => raw[id]));
    const rawTop = eligible.filter(id => raw[id] === rawMax).length;
    return {
      round, eligible, counts, raw, complete, leaders,
      winner: complete && leaders.length === 1 ? leaders[0] : null,
      tiebreak: leaders.length === 1 && rawMax > 0 && (rawTop > 1 || raw[leaders[0]] < rawMax),
      deadlock: complete && leaders.length > 1,
      history,
    };
  }
}
