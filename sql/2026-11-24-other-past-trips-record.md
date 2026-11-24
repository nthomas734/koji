# 2026-11-24 · The other past trips rewritten as records

Rome + Florence, San Diego (June), Cuyamaca, New York and Mom's 70th got the Japan 2026 treatment,
following `sql/2026-11-24-past-trips-spec.md`. Applied live; row-level before/after is in `koji_history`.
Contact sheets and working files: `~/Documents/Code/mockups/past-trips-photos/<slug>/`.

**Camera clock.** Every 2026 frame is tagged -06:00 (Central standard, no DST): Rome = camera + 8 h,
UK = + 7 h (BST) then + 6 h from Oct 25, New York = + 2 h in October, San Diego = + 1 h in summer.

## rome-florence-may-2026
- Flight home was UA 971 FCO→ORD nonstop, Jun 1 9:45am–1:15pm (United rebooked May 30); the UA 885 /
  UA 2649 legs are gone. Trains were Italo: 8906 Roma Termini 8:55am → Firenze S.M.N. 10:31am (May 27),
  8963 Firenze 6:03pm → Roma Termini 7:55pm (May 30, changed that morning from the 1:43pm).
- Photos cover only Tue May 26 (175 frames) and Fri May 29 (20). Added Capitoline Hill, Theatre of
  Marcellus, Santa Maria sopra Minerva, the Duomo and Santa Maria Novella; Trevi and the Pantheon retimed.
- May 30 dinner is Elio at the Hoxton, 9:45pm (OpenTable). "Evening Explore" that day removed.
- Stays: Rome, Florence, Rome. Five optionals untouched.

## new-york-oct-2026
- Oct 13 was the High Line at sunset (69 frames), not Times Square; the two High Line stops moved from
  Wednesday and their koma shots' `day_id` followed. Oct 14 gains Greenwich Village.
- Both flights are tickets; UA 1637's `arrive_label` carries no zone (a one-day leg shows the arrival
  city's zone on the departure otherwise).

## san-diego-jun-2026
- No photos; rebuilt from United, Lyft/Uber, tour-confirmation and luggage-storage emails. Tours moved to
  confirmed times; Sunday's Del Mar dinner and Monday's Mercato morning replaced by what the receipts show.
  Saturday stands on the plan alone.

## cuyamaca-oct-2026
- Two unidentifiable frames. Format work only: drive ticket, stay, wording. 13 optionals untouched.
  Campsite confirmation number removed from `meta`.

## moms-70th
- ~970 frames across nine days. 15 stops added (Burleigh Court gardens, Knightsbridge, London Bridge,
  Westminster at dusk, Richmond Green, Battersea and the riverboat, Soho, the Lamb & Flag…), 4 removed,
  5 optionals confirmed, the Slaughters walk reordered (Upper before Lower), Liberty and Tate retimed.
- UA 14 out and UA 4 home confirmed by United emails. Others' flights as the rows stated.
- 16 optionals untouched. Stow-on-the-Wold and Leadenhall Market are contradicted by the photos but have
  koma shots attached, so they were left for Nathan.
- Planning notes in logistics left in place.

## Code that shipped with this (PR #45)
Car glyph on drive tickets; past trips hide Book Ahead rows and "Book ahead" stop corners.
