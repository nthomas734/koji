# koji UPDATE — proper home-screen icon

## What this fixes

iOS was showing a generic "K" letter because:
- No `apple-touch-icon.png` declared
- No `manifest.json`
- The previous SVG-only setup works for desktop favicons but not iOS

This bundle ships:
- **5 PNG icons** at the sizes iOS / Android / browsers need
- **A new `icon.svg`** with proportions matched to the home-screen tile (bigger grain, less crowded — matches the daizu icon's visual rhythm)
- **A `manifest.json`** for PWA install
- **An updated `layout.tsx`** that declares all of the above

The in-app `KojiMark` component is also updated to use the same simpler proportions so the inline logo and the home-screen icon look like the same logo.

## Files in this zip

```
public/
  icon.svg                — replace (new tile-tuned proportions)
  icon-180.png            — NEW
  icon-192.png            — NEW
  icon-512.png            — NEW
  apple-touch-icon.png    — NEW (iOS reads this specifically)
  favicon-32.png          — NEW (browser tabs)
  manifest.json           — NEW
src/
  app/layout.tsx          — replace (declares all the above)
  components/KojiMark.tsx — replace (updated to match new proportions)
```

## Upload via GitHub web

1. Open the koji repo on `main` at the root
2. **Add file → Upload files**
3. Drag both the `public/` and `src/` folders from the unzipped bundle into the upload area
4. GitHub web will show the diff — you should see ~9 files (6 in public, 2 in src, possibly more if KojiMark.tsx is changing)
5. Commit message: `feat: home-screen icon + manifest`
6. Commit directly to `main`

## After Vercel redeploys

To verify the new home-screen icon on your phone:

1. **Delete the existing koji shortcut** from your home screen (long-press → Remove App → Delete from Home Screen)
2. Open `https://koji-iota.vercel.app` in Safari
3. Tap the share icon → **Add to Home Screen**
4. The preview should now show the brass grain-pin icon, not the "K" letter

If you still see the "K" letter on the preview:
- iOS aggressively caches favicons. Try in a fresh private browsing tab
- Or force a hard reload of the site first

## Notes

- The new `icon.svg` matches the PNG proportions, so if you ever want to add the icon to the iOS Safari tab strip or other places that read SVG, it'll be consistent
- `manifest.json` `background_color` and `theme_color` are both parchment (`#F5F0E8`) to match the in-app surface
- `appleWebApp.statusBarStyle: 'default'` keeps the iOS status bar light (matches the parchment background). If you ever flip the app to dark-mode dialect, change this to `'black-translucent'`
