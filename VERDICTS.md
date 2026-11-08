# Verdicts

Nathan's private "was it worth it" call on each place in a trip: **go back**,
**fine once**, or **skip**, plus an optional private note. Shipped 2026-11-08.

Only Nathan sees them:

- The `koji_verdicts` table has RLS on and **no policies**, so the public site's
  key can't read it at all.
- Every read and write goes through `/api/verdicts`, which needs the
  `koji_admin` cookie. The cookie now lasts a year.
- The trip page is prerendered and public, so it never contains a verdict. The
  stamps load afterwards and appear only when that API answers 200. Anyone else
  gets a 401 and an ordinary itinerary.

## Before a trip

1. On the phone, open `koji-iota.vercel.app/admin/login` in the installed app
   and log in. Stamps then show on every trip page for a year.
2. Set up the Shortcut below, once.

## During a trip

- **Planned stop.** Tap the dashed circle on the right of the stop, pick a
  verdict, and optionally add a note. With no signal, taps queue on the phone
  and send when there's a network again.
- **Somewhere not on the plan, from inside koji.** Tap
  "+ somewhere not on the plan" under the day, type the name, then pick a
  verdict. A Google Maps search link is made from the name and the day's city.
- **Somewhere not on the plan, from Google Maps.** In Maps, tap Share, then
  **Add to koji**, then pick a verdict. The place lands on today's day of
  whichever trip covers today.

Unplanned places only ever live in `koji_verdicts`. They are never added as
`koji_stops`, which would make them public.

## The "Add to koji" Shortcut (iOS)

iOS doesn't let a home-screen web app appear in the share sheet, so a
Shortcut does instead. It needs `KOJI_SHARE_TOKEN`, which is set in Vercel →
koji → Settings → Environment Variables. Use the same value in step 5.

In the Shortcuts app, create a new shortcut named **Add to koji**:

1. Open its settings (ⓘ). Turn on **Show in Share Sheet**, and set it to
   receive **URLs** and **Text**.
2. **Choose from Menu**, with the prompt "How was it?" and four options:
   - "Go back": add a **Text** action containing `back`
   - "Fine once": **Text** `once`
   - "Skip": **Text** `skip`
   - "Not yet": **Text**, left empty

   After the menu, add **Set Variable** and name it `Verdict`, set to the menu
   result.
3. **Ask for Input** (Text), with the prompt "Private note (optional)". Leave
   the default empty.
4. **Format Date**: Current Date, Custom format `yyyy-MM-dd`.
5. **Get Contents of URL**:
   - URL: `https://koji-iota.vercel.app/api/verdicts/share`
   - Method: **POST**
   - Headers: `Authorization` = `Bearer <KOJI_SHARE_TOKEN>`
   - Request Body: **JSON**, with these keys:
     - `text` = Shortcut Input
     - `date` = Formatted Date
     - `verdict` = Verdict
     - `note` = Provided Input
6. **Get Dictionary Value** `message` from Contents of URL.
7. **Show Notification** with the Dictionary Value.

The route reads the place name from the share text. If Maps only shares a
link, the route follows the link and takes the name from the full Maps URL.
It stores a Google Maps search link plus the original shared link. A 404 that
says "no koji trip covers <date>" means no trip's dates cover today.

## After a trip: photo rebuild (a Claude Code task, not an app screen)

Ask Claude in a Claude Code session on the Mac: "rebuild <trip slug> from my
photos." Claude then:

1. Reads the trip's photos from the Photos library for `date_start..date_end`,
   using their capture times and GPS. `osxphotos query --from-date … --to-date
   … --json` works well.
   - iPhone photos are reliable.
   - a7V frames only have GPS if the camera was paired to the phone.
2. Groups photos into visits, matches each visit to a planned stop, and lists
   the rest as new places for Nathan to rate.
3. Writes the confirmed new places as `koji_verdicts` rows with
   `source = 'photo'` and `client_key = 'photo:<yyyy-mm-dd>-<slug>'`.
4. Asks "did you go?" about planned stops that have no photos and no stamp.

## After a trip: the Hitlist hand-off

From `koji_verdicts`:

- Copy places marked `back` into the shared "Japan Hitlist" Google Doc
  (`1Zlym74SgpUwvMawpcdKNe7GQHpjm4ilGyEFIjSITgI0`), under that trip's city,
  using the doc's existing format:
  - a city bullet, with place bullets under it
  - each place name linked to its Google Maps search
  - a short note in parentheses
- **Never copy `note`.** It is private. Write a fresh, friendly line for others
  to read.
- Add any new cities to Nathan's Cities Visited list.
- Keep `skip` places in mind so they are never suggested again.
