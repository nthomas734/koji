// Holding space for what appears after load (2026-11-15). The weather pill and
// the trip-alerts note sit above the itinerary but are only known once the page
// is running on the phone, so they used to push it down 50-120px as they
// appeared (layout shift 0.08-0.14). Each visit records how tall they came out
// on this phone, per trip page; on the next load HOLD_SCRIPT (inline in
// layout.tsx, so it runs before the first paint) sets them as CSS variables and
// the placeholders take those heights. Nothing shown means nothing recorded and
// nothing held, so a phone that dismissed the note, has alerts on, or can't use
// them never gets an empty gap; one whose answer changed sees a single shift.

export const HOLD_KEY = 'koji:hold';

/** Per page key (TripAlerts' slug: "<slug>" or "<slug>/<part>"): a = alerts note, w = weather pill. */
type Hold = Record<string, { a?: number; w?: number }>;

export const HOLD_VARS = { a: '--koji-alerts-h', w: '--koji-wx-h' } as const;

/** Record this page's height for next time (0 = not shown) and drop the held space. */
export function rememberHeight(page: string, which: 'a' | 'w', height: number) {
  try {
    const all: Hold = JSON.parse(localStorage.getItem(HOLD_KEY) || '{}');
    const h = Math.round(height * 10) / 10;
    const entry = { ...all[page] };
    if (h > 0) entry[which] = h; else delete entry[which];
    if (Object.keys(entry).length) all[page] = entry; else delete all[page];
    localStorage.setItem(HOLD_KEY, JSON.stringify(all));
  } catch { /* private mode */ }
  // A page reached in-app must not inherit this one's held space
  document.documentElement.style.removeProperty(HOLD_VARS[which]);
}

/** Runs before the first paint. /trips/<slug> and /trips/<slug>/<part> only. */
export const HOLD_SCRIPT = `try{var m=location.pathname.match(/^\\/trips\\/(.+?)\\/?$/);if(m){var e=JSON.parse(localStorage.getItem('${HOLD_KEY}')||'{}')[decodeURIComponent(m[1])],s=document.documentElement.style;if(e){if(e.a>0&&e.a<400)s.setProperty('${HOLD_VARS.a}',e.a+'px');if(e.w>0&&e.w<400)s.setProperty('${HOLD_VARS.w}',e.w+'px')}}}catch(x){}`;
