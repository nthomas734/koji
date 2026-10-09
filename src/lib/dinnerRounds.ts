// ── DINNER ROUNDS ───────────────────────────────────────────────────────────
// Shared by the vote route (which enforces it) and the page (which draws it).
// Round 1 is every option. When everyone on the trip has voted in a round and
// two or more options share the top count, the next round is a runoff between
// just those options. Earlier rounds are then closed. A round where every
// option is still tied cannot be narrowed, so it is reported as a deadlock.

export type RoundVote = { option_id: number; voter: string; round: number };

export type RoundHistory = { round: number; counts: Record<number, number> };

export type RoundState = {
  round: number;
  eligible: number[];
  counts: Record<number, number>;
  complete: boolean;
  leaders: number[];
  winner: number | null;
  deadlock: boolean;
  history: RoundHistory[];
};

export function dinnerState(optionIds: number[], votes: RoundVote[], voters: string[]): RoundState {
  const people = new Set(voters);
  let eligible = [...optionIds];
  let round = 1;
  const history: RoundHistory[] = [];
  for (;;) {
    const rv = votes.filter(v => v.round === round && people.has(v.voter) && eligible.includes(v.option_id));
    const counts: Record<number, number> = {};
    for (const id of eligible) counts[id] = 0;
    for (const v of rv) counts[v.option_id] += 1;
    const complete = people.size > 0 && new Set(rv.map(v => v.voter)).size >= people.size;
    const max = Math.max(0, ...eligible.map(id => counts[id]));
    const leaders = max > 0 ? eligible.filter(id => counts[id] === max) : [];
    if (complete && leaders.length > 1 && leaders.length < eligible.length && round < 9) {
      history.push({ round, counts });
      eligible = leaders;
      round += 1;
      continue;
    }
    return {
      round, eligible, counts, complete, leaders,
      winner: complete && leaders.length === 1 ? leaders[0] : null,
      deadlock: complete && leaders.length > 1,
      history,
    };
  }
}
