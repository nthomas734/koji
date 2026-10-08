# Word Doc Format Reference

This file documents the exact structure of Nathan's itinerary Word docs. Read this before generating any itinerary .docx file.

## Overall document order

1. Title heading
2. ✈️ Flights
3. 🧠 Work + Sleep Structure (only if working during trip)
4. 🕒 Timezone mapping (only if working across time zones)
5. ⏰ "End Work Early" Flags (only if working — calls out specific work nights to wrap early)
6. 🏨 Hotel Bases
7. 🎟 Reservations / Tickets Checklist (only if applicable)
8. 🧳 Luggage & Laundry (only for multi-city trips)
9. 💴 Money & Passes (only for international trips)
10. ⚠️ Timing Risks & Notes (only if applicable)
11. 😴 Sleep Transition Strategy (only if relevant — long-haul, jet lag concerns)
12. 🧩 Contingencies (only if applicable)
13. 📅 Full Itinerary (day-by-day)

The Efficiency Check + Suggested Additions go **above** the document title in chat — not inside the doc itself.

## Title heading

```
# 🌆 [City] Itinerary — [Month Day–Day, Year]
```

Or for multi-city / longer trips:

```
# Japan Master Itinerary — Master Control Version 3.3
Mar 1 – Apr 5, 2026
Nathan — Solo + Group + Fukuoka
```

Use the cityscape emoji for cities, or pick a fitting one (🗾 Japan, 🇵🇹 Portugal, etc.).

## ✈️ Flights section

Group by traveler when there are multiple people. Each flight is one line:

```
## Nathan
- **2/28** · ORD → LAX — UA 576 · Departs 15:00 · Arrives 18:45 · Boeing 737-300
- **3/1** · LAX → HND — UA 32 · Departs 11:05 · Arrives 15:55 · Boeing 737-9 Dreamliner
```

Format: `**Date** · ROUTE — Carrier+Flight# · Departs TIME · Arrives TIME · Aircraft (· Seat if known)`

Use `·` (middle dot) as the in-line separator between flight detail fields. Use `—` between the route and the carrier/flight info.

For a single-traveler trip with just two flights, a flat list is fine — no subheadings needed.

## 🏨 Hotel Bases

Each hotel is a hyperlinked one-liner:

```
- [Sotetsu Grand Fresa Takadanobaba](maps-link) — practical Tokyo base with easy transit access
- [Caption by Hyatt Namba Osaka](maps-link) — modern Namba base for food walks + fast transit
```

For multi-traveler trips, you can split hotel assignments inline:

```
- Nathan & Dez: [Hotel Keihan Namba Grande](maps-link) — group-friendly Namba base
- Marshall & Francesca: [Onyado Nono Namba](maps-link) — onsen-style comfort base
```

## 🎟 Reservations / Tickets Checklist

Bullet list of time-sensitive bookings with date and any prep notes:

```
- [Tokyo Dome](maps-link) — 3/6 19:00 — ticket in hand; arrive ~18:00
- [Sushi Hiro (Osaka)](maps-link) — 3/11 — reserve counter time
- [Moeyo Mensuke](maps-link) — 3/10 — line early to avoid sell-out (~20:00 risk)
```

## 🧠 Work + Sleep Structure

Used when Nathan is working during the trip. Format:

```
## 🧠 Work + Sleep Structure (Japan Time)

Pre-DST (Tokyo week — Mar 1–7)
Work window: 00:00–08:00 JST
Sleep: 08:30–15:30
Explore: 16:00–23:00
```

Multiple blocks if the schedule shifts mid-trip (e.g., before/after DST, or recovery weeks).

## 📅 Day blocks — the core format

Each day follows this exact pattern:

```
## 📅 [Day-of-week] Mar 1 — [Theme/Subtitle]

[Optional one-line context like "Nathan arrives" or "work night" or "no work"]

- [Place](maps-link) — description
- Transit: [Origin → Destination](directions-link) — typical ~XX min
- [Place](maps-link) — description
- [Place](maps-link) — description
```

### Day subtitle conventions

The subtitle should describe the *theme* or *anchor* of the day:
- Geographic: "Polanco", "Chapultepec → Centro Histórico", "Roma Norte + Neighborhood Wandering"
- Activity-driven: "Kamakura Day Trip", "Tokyo Dome Night", "Final Easy Loop"
- Logistical: "Tokyo → Osaka (Shinkansen)", "Marshall Arrives / Move to Hyatt", "Departure Split"

When work is involved, append parenthetical context: `(work night)`, `(no work)`.

### Transit links between activities

For complex multi-stop days (especially in Japan-style itineraries), include transit links between consecutive activities:

```
- Transit: [Hotel → Kamakura Station](directions-link) — ~65 min typical
- [Hasedera (Kamakura)](maps-link) — temple gardens; temples close ~16:30–17:00
- Transit: [Hasedera → Kotoku-in](directions-link) — quick local hop
- [Kotoku-in](maps-link) — Great Buddha
```

The directions URL format:
`https://www.google.com/maps/dir/?api=1&origin=ORIGIN&destination=DEST&travelmode=transit`

(Use `walking` instead of `transit` when it's clearly a walking distance.)

For lighter itineraries (Mexico City–style), transit links are optional — only include them when transit is non-obvious.

### Travel Day Mini-Checklist

For days involving flights, long trains, hotel transfers, or airport runs, add a small checklist at the end of the day block:

```
Travel Day Mini-Checklist
- Arrival essentials in backpack: passport, wallet, charger, meds, 1 change of clothes, toothbrush
- ATM + IC card: do it at the airport before heading into the city
- "Only one mission" tonight: eat something simple + sleep
```

Keep these tactical and trip-specific — not generic.

### Time-sensitive flags inline

When a place has an early close, sell-out risk, or queue concern, fold it into the description:

- `[KOFFEE MAMEYA](link) — must-hit coffee; closes ~18:00`
- `[Moeyo Mensuke](link) — line early to reduce sell-out risk`
- `[Nijō Market](link) — breakfast; closes ~14:00`

## ⚠️ Timing Risks & Notes section

Group risks by type with sub-headings:

```
## ⚠️ Timing Risks & Notes

Coffee spots with early closes
- [KOFFEE MAMEYA](link) — closes ~18:00 → go first on Thu 3/5

Queues / sell-outs
- [Moeyo Mensuke](link) — arrive ~opening; soup can sell out by ~20:00

Markets
- [Kuromon Ichiba Market](link) — many stalls close ~18:00–19:00 → start there on Sat 3/7
```

## 🧩 Contingencies

Simple if-then bullet list:

```
- If Kamakura (3/3) runs long: skip Enoshima sunset or move it to a future Tokyo day.
- If Moeyo Mensuke line is wild: pivot to [Ramen Yashichi](link) or [Ramen Jinya Umeda](link).
- If Lake Tōya weather is poor: swap to Jōzankei Onsen day or add time at [Sapporo Beer Museum](link).
```

## Generating the .docx

When generating the actual Word file:

1. Read `/mnt/skills/public/docx/SKILL.md` first for the mechanics
2. Use real Word hyperlinks (not visible URLs) — the `docx-js` approach in that skill handles this
3. Em dashes must render as actual `—` characters, not `--` or `-`
4. Headings should use real Word heading styles (Heading 1 for `#`, Heading 2 for `##`)
5. Bullet points should be real Word bullets, not text characters
6. Test that the doc pastes cleanly into Google Docs — that's the primary use case

## Examples from real itineraries

### Mexico City style (lighter, shorter trip, no work)

```
# 🌆 Mexico City Itinerary — Nov 20–25, 2025

## ✈️ Flights

### Nathan (ORD ⇄ MEX)
- **Thu, Nov 20** · ORD → MEX — UA 359 · Departs 8:55 a.m. · Arrives 1:35 p.m.
- **Tue, Nov 25** · MEX → ORD — UA 474 · Departs 2:40 p.m. · Arrives 6:52 p.m.

## 🏨 Hotel Bases
- [Lamartine Boutique Hotel Polanco](link) — Boutique stay in Polanco (request late checkout)
- [Hyatt Regency Mexico City](link) — Perfect Polanco base near Chapultepec

## 📅 Full Itinerary

### 📅 Thursday, Nov 20 — Nathan Arrives (Polanco)

Nathan arrives: 1:35 p.m.

Hotel: [Lamartine Boutique Hotel Polanco](link) (request late checkout)

**Afternoon Options**
- [Museo Soumaya](link) — Iconic silver asymmetrical art museum with free entry
- [Eno Polanco](link) — Enrique Olvera's casual daytime café

**Dinner**
- [Tacos Don Juan](link) — Excellent al pastor + bistec in a low-key local taquería
```

### Japan style (heavy, multi-week, work-integrated)

Use the full set of optional sections: work/sleep structure, timezone mapping, end-work-early flags, luggage/laundry, money/passes, timing risks, sleep transition, contingencies, and door-to-door transit links inside each day block. See the Japan Master Itinerary doc as the canonical reference.

### Portugal style (single traveler, work-integrated, lighter logistics)

Mid-weight: include work blocks inline within days (`4:00pm–12:00am: Work`), keep transit links lighter, focus on neighborhood walking loops and meal anchors.
