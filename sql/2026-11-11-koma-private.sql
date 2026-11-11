-- 2026-11-11: koma goes private. Run AFTER the deploy that reads the koma tables
-- with the service role (getKomaForTrip, /api/koma/*, /koma pages) is live; the
-- old build read them with the anon key.
drop policy if exists koma_public_read_shots on koma_shots;
drop policy if exists koma_public_read_rolls on koma_rolls;
drop policy if exists koma_public_read_carry on koma_carry;
drop policy if exists "koma_notes public read" on koma_notes;
-- RLS stays on with no policies: anon and authenticated read nothing; the
-- service role bypasses RLS.

-- Same day, separate: Naka-Meguro pin to golden hour after the MAMEYA swap.
update koma_shots set at_time='16:45', light='golden', stop_id=594 where id=100;
