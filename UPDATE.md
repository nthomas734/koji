# koji UPDATE — mobile fixes + logo

## What this changes

Three things, all driven by the mobile screenshots:

1. **Logistics column stacks vertically on narrow screens** so it doesn't dominate before the user sees Day 1
2. **Time-label column gets more breathing room** (56px → 70px desktop, 60px mobile) and uses `white-space: nowrap` so labels stop wrapping
3. **Inline `<br><br>` rendering** in the body content so dinner three-options can be separated by line breaks

Plus the koji logo is finally shipped — refined-original variant (grain-as-pin with map context).

## Files in this zip

```
src/
  app/
    globals.css                           — replace
    page.tsx                              — replace (home page header gets the logo)
    trips/[slug]/page.tsx                 — replace (refactored to use class-based grids + logo)
  components/
    KojiMark.tsx                          — NEW (shared brass-line SVG component)
public/
  icon.svg                                — replace (was placeholder text, now the real logo on dark)
```

`src/components/` may not exist yet — that's fine, GitHub web will create it when you upload the file.

## Order of operations

The code can be deployed first; the SQL update is independent.

### Step 1 — Add `src/components/KojiMark.tsx`

In GitHub web, navigate to `src/`. There may not be a `components` folder yet.

- If you see a `components` folder: open it, click **Add file → Upload files**, drag `KojiMark.tsx` in, commit.
- If there's no `components` folder: open any file in `src/`, click the file path at the top to navigate up to `src/`, then click **Add file → Create new file**. In the filename box type `components/KojiMark.tsx` (the slash creates the folder). Paste the contents of `KojiMark.tsx` from this zip. Commit.

### Step 2 — Replace `src/app/globals.css`

Navigate to the file → pencil icon → select all → paste the new contents from the zip → commit.

### Step 3 — Replace `src/app/page.tsx`

Same flow.

### Step 4 — Replace `src/app/trips/[slug]/page.tsx`

Same flow.

### Step 5 — Replace `public/icon.svg`

Same flow.

### Step 6 — Run the dinner-fix SQL

After Vercel redeploys (1–2 min), run `koji_moms_70th_dinner_fix.sql` in the Supabase SQL editor. It updates the dinner stops to use `<br><br>` between options and shortens "Late morning" → "Late AM" on Day 1.

## What to verify after deploy

1. **Home page:** logo appears next to "koji · 行程" in the header
2. **Trip page:** small logo appears next to "← koji" back-link
3. **Mobile (~430px wide):** logistics columns are stacked, not side-by-side
4. **Mobile:** time labels like "11:30am" no longer wrap; "Late AM" reads on one line
5. **Mobile:** dinner three-option blocks have visible line breaks between options
6. **Home-screen icon:** if you re-add koji to your home screen, the icon should now be the brass grain-pin on black (you may need to delete the existing home-screen icon and re-add via Safari to bust the cache — see kura skill notes)

## What didn't change

- Database schema, RLS policies, API routes
- Any other styles, animations, or layout outside the trip page and home page
- Admin editor (still works as-is, including the free-form Tag input from the previous update)
- The forest theme, the parchment palette, the typography stack

## Notes

- The `KojiMark` component takes `size` and `color` props. Default is 32px brass. To use it on a dark surface (e.g. inside a forest-theme card), pass `color="#C8A97E"` (the dark-dialect brass).
- The mobile breakpoint is 480px. Anything narrower stacks logistics and tightens the time gutter. Above that, the desktop two-column logistics grid is preserved.
- `public/icon.svg` is now the master home-screen icon. The PNG sizes (`icon-180.png`, `icon-192.png`, `icon-512.png`, `apple-touch-icon.png`) referenced in `kura-ecosystem` skill are NOT in this zip — most browsers and iOS will fall back to the SVG. If you want the PNGs generated, easiest path is to open `icon.svg` in a browser, screenshot at the right sizes, and upload. Or use a tool like [realfavicongenerator.net](https://realfavicongenerator.net/) and feed it the SVG.
