---
name: itinerary-builder
description: Use this skill whenever Nathan is planning a trip, building an itinerary, researching a destination, or revising a travel document. Triggers include any mention of trips, travel, flights, hotels, day plans, or specific cities/countries he's visiting or considering — even casual phrasing like "I'm thinking about Lisbon" or "what should I do in Tokyo on a Tuesday." Also triggers for revisions to existing itineraries (adding a day, swapping a hotel, changing a restaurant), packing lists, restaurant cheat sheets, transportation guides, and any trip-related deliverable. Final output is almost always a Word document built via the docx skill, formatted to Nathan's exact specifications. Do NOT use this skill for non-travel writing tasks even if they involve scheduling.
---

# Itinerary Builder — Nathan's Travel Planning Skill

## Purpose

Build clean, structured, Google-Docs-friendly travel itineraries for Nathan. Every output should feel like a polished deliverable, not a brainstorm. The default deliverable is a Word document — see `references/word_doc_format.md` for the full structural template before generating one.

## Nathan's Travel Profile

Bake these into every plan without having to be asked:

- Loves high-quality coffee shops, modern restaurants, scenic walks, museums, bookstores, architecture, parks
- Mixes casual and upscale dining
- Travels while working — when work hours are mentioned, structure the day around the work block
- Uses Hyatt hotels often (default to Hyatt properties when suggesting hotels in cities that have one, unless a better-fitting boutique exists)
- Knows Spanish basics
- Hates long paragraphs — wants short, crisp, structured sections
- Prefers extremely detailed, walkable, geographically-coherent days
- Wants Google Docs–ready formatting that pastes cleanly

## Core Formatting Rules — ALWAYS FOLLOW

These rules are non-negotiable. If a draft deviates from them, fix it before showing it.

### 1. Hyperlink behavior — every place link is a Google Maps link

- NEVER show raw URLs anywhere in the document
- Hyperlink the place name itself, exactly as it appears in the description
- The URL is **always** a Google Maps search link in this format: `https://www.google.com/maps/search/?api=1&query=PLACE+NAME+CITY`
- Door-to-door transit between consecutive activities uses: `https://www.google.com/maps/dir/?api=1&origin=ORIGIN&destination=DEST&travelmode=transit`
- **Never link a venue's own website, even when you know it.** No `herbandwood.com`, no `loftycoffee.com`, no `pendry.com`, no AllTrails, no Recreation.gov, no Resy, no OpenTable, no Instagram. The reader can search if they want the menu — the link's job is "where is this," not "what is this."
- Never link to Apple Maps, even when transcribing or revising material that originally used it
- Never put a link on its own line separated from its description
- Never leave a place unlinked unless no Google Maps result plausibly exists (rare)

### Query specificity

The visible link text and the `query=` param don't have to be identical — link text is for the reader, query is for Google's matcher. Always include enough context that Google resolves to the right pin on the first try. Under-specific queries drop users on a website autocomplete result instead of a map.

| Type of place | Query format | Example |
|---|---|---|
| Restaurant or business | `Name + City` | `Herb+%26+Wood+San+Diego` |
| Hotel | `Name + City` | `Park+Hyatt+Tokyo` |
| Neighborhood, street, generic feature | `Name + City` | `India+St+San+Diego`, `Little+Italy+San+Diego` |
| Apartment / specific address | The address itself | `1551+Union+St+San+Diego` |
| Trail or natural feature | `Name + locality` | `Penny+Pines+Trailhead+Mount+Laguna` |
| Globally unique / iconic | Name alone is fine | `Tokyo+Dome`, `Meiji+Jingu` |

When in doubt, append the city. Over-specific still finds the right place; under-specific fails.

### URL encoding

- Spaces → `+`
- `&` → `%26` (raw `&` breaks the query string after the ampersand)
- Apostrophes → drop them (`Oscar's` → `Oscars`); Google's matcher is fuzzy enough
- Commas → `%2C` (or omit if not needed)

### 2. One-line activity descriptions

Every activity follows this exact pattern, on a single line:

`[Place Name](maps-link) — short description`

Examples:
- `[LagoAlgo](maps-link) — lakeside modern Mexican cuisine with great architecture`
- `[Panadería Rosetta](maps-link) — bakery famous for the guava roll`
- `[KOFFEE MAMEYA](maps-link) — must-hit coffee; closes ~18:00`

Do NOT break onto two lines. Do NOT shorten the description to nothing. Do NOT remove descriptions on revisions unless explicitly told to.

### 3. Long em dashes only

Always use `—` (em dash), never `-` (hyphen) as a separator between place and description, or between flight segments.

### 4. Spacing

- One blank line between sections
- Multi-line allowed when there are genuinely separate items (flight departure + arrival, multi-step activities, multiple checklist bullets)
- No random extra spaces

### 5. Headings use emoji + bold

Examples:
- `# 🌆 Mexico City Itinerary — Nov 20–25, 2025`
- `# ✈️ Flights`
- `# 🏨 Hotel Bases`
- `# 📅 Full Itinerary`
- `# 🎟 Reservations / Tickets Checklist`
- `# 🧳 Luggage & Laundry`

### 6. Day structure

Each day in the itinerary follows this pattern:

```
## 📅 Day Title — Subtitle

Optional one-line context if needed.

- [Place](link) — description
- [Place](link) — description
- [Place](link) — description
```

Day subtitles should describe the *theme* of the day, not just the date. Examples:
- "Nathan Arrives (Polanco)"
- "Chapultepec → Historic Center Cluster"
- "Kamakura Day Trip"
- "Tokyo → Osaka (Shinkansen)"

## Standard Sections

Every full itinerary has these in order:

1. **Title heading** — city/trip name + dates
2. **✈️ Flights** — see `references/word_doc_format.md` for flight block format
3. **🏨 Hotel Bases** — hyperlinked hotel names + one-line description each
4. **📅 Full Itinerary** — day-by-day

These sections are **optional** and only appear when relevant or requested:

- **🎟 Reservations / Tickets Checklist** — include automatically when there are time-sensitive bookings (concert, omakase, hard-to-get reservation)
- **🧠 Work + Sleep Structure** — include automatically when Nathan mentions working during the trip
- **🕒 CST ↔︎ JST Mapping** (or other timezone mapping) — include for long stays in distant timezones with work involved
- **🧳 Luggage & Laundry** — include for multi-city trips with luggage forwarding decisions
- **💴 Money & Passes** — include for international trips where rail passes / cash norms differ
- **⚠️ Timing Risks & Notes** — include when there are early-closing markets, sell-out risks, last-train concerns
- **🧩 Contingencies** — include for weather-dependent days or risky reservations
- **Packing list, budget breakdown, restaurant cheat sheet, transportation guide, weather summary, airport lounge guidance** — only when explicitly requested

For the precise format of each section, see `references/word_doc_format.md`.

## The Efficiency & Completeness Review

Run this review **before** presenting any new itinerary or any major revision (new day, new city, hotel swap, big additions/removals). Place it directly above the final itinerary, not inside it.

### ⚠️ Efficiency Check

Short bullet points calling out:
- Activities near each other but placed on different days
- Activities far apart or requiring unrealistic transit
- Overloaded days, or timing that ignores closing hours / peak hours / queue risk
- Redundancies (too many similar cafés, too many museums in a row, repeated experiences)
- Logistical red flags (backtracking, late-night transit, airport timing)

Suggest simple fixes when helpful (swap days, combine nearby stops, drop something optional).

### ⭐ Suggested Additions

A short list of things that fit Nathan's interests but seem missing — standout coffee shops, architecture, parks, museums, bookstores, signature experiences. Only meaningful suggestions, not filler.

### When to skip the review

- Tiny edits ("change dinner Tuesday to X") — just make the change
- Pure information requests ("what's the best ramen in Sapporo") — answer directly without producing a doc

## Revision Discipline

When Nathan asks for changes:
- Keep everything else **exactly** the same
- Only modify what he explicitly requested
- Never remove descriptions unless told to
- Never "simplify" or "summarize" unless instructed
- Maintain original ordering unless told to reshuffle
- If a revision affects pacing, geography, or flow, re-run the Efficiency Check

## Tone

- Clear, organized, confident
- No filler, no slang
- Anticipate needs (closing times, reservation requirements, peak hours) but stay concise
- Every answer should feel like a polished deliverable

## Workflow for Building a Full Itinerary

1. **Confirm the basics** — dates, cities, who's traveling, work obligations, hotels (already booked or to suggest), any non-negotiable anchors (concerts, reservations, meetings)
2. **Read `references/word_doc_format.md`** for the exact Word doc structure, optional sections, and example blocks
3. **Read the docx skill at `/mnt/skills/public/docx/SKILL.md`** before generating the file
4. **Draft the itinerary** following all formatting rules
5. **Run the Efficiency & Completeness Review** and place it above the itinerary
6. **Generate the .docx** via the docx skill
7. **Present the file** with a brief summary — do not re-explain the contents

## Fail-Safes

- If you ever deviate from the formatting rules, repair it on the next reply
- If you forget a description, hyperlink, or em dash, fix it immediately
- If something is unclear about Nathan's preferences, ask: "Do you want this added to all future itineraries?" — do not silently assume
