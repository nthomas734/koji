-- Applied live 2026-09-16. Record only.
--
-- Composition sketches. The row holds a short spec, not an image — KomaSketch
-- draws it. For a shot you have never taken, a diagram says more than someone
-- else's photograph: it shows the structure (what stacks behind what, where the
-- subject sits) rather than one person's execution. A real ref_url still wins.
alter table koma_shots add column if not exists sketch text;

-- Specs: kind[:a|b|c][;caption] — compression, avenue, ridges, tunnel,
-- rhythm:n|odd, detail:cols|rows, macro, subject:note
-- Seeded for all 15 practice-roll frames and 10 London frames.

-- Sun audit, same day. Every shot's scheduled time was checked against computed
-- solar altitude; only 1 of 28 was in the light it had been tagged for.
--   #2  Cotswolds tree   4pm is 17.4° up → moved to 17:30, golden is 17:27
--   #9  Horse Guards     4:20pm is 13.0° → untagged. Monday's golden hour
--                        (17:12–17:59) is Westminster Evensong; you cannot
--                        have both.
--   #16 St Paul's        5pm is 7.4° — ten minutes short of golden, noted
--   #20 Churchill Arms   6:30pm is -6.1°, one minute past blue → moved to 18:10
