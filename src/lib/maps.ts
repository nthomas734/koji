// Map links the app builds itself. Google Maps is blocked on the mainland and
// its China data is offset, so China trips (decided 2026-11-14) link Apple Maps,
// searching the Chinese name with a city hint. Everything else keeps Google.
// Shared by client components and server routes: nothing server-only here.

/** Trip / day time zones whose places link Apple Maps instead of Google. */
const APPLE_MAPS_TZ = new Set(['Asia/Shanghai', 'Asia/Hong_Kong', 'Asia/Macau']);

export function usesAppleMaps(tz: string | null | undefined): boolean {
  return !!tz && APPLE_MAPS_TZ.has(tz);
}

const join = (parts: (string | null | undefined)[]) => parts.filter(Boolean).join(' ').trim().replace(/\s+/g, ' ');

/** Apple Maps search. `ll` ("lat,lng") biases the search to the right city. */
export function appleSearchUrl(query: string, ll?: string | null): string {
  return `https://maps.apple.com/?q=${encodeURIComponent(query)}${ll ? `&sll=${ll}` : ''}`;
}

/** Apple Maps directions by transit. */
export function appleDirectionsUrl(query: string): string {
  return `https://maps.apple.com/?daddr=${encodeURIComponent(query)}&dirflg=r`;
}

/** The Google Maps search link every place in the kura apps uses. Lives here,
 *  not in lib/supabase.ts: a client component importing it from there ships the
 *  whole Supabase client (~65 KB compressed) to every reader. */
export function mapsSearchUrl(...parts: (string | null | undefined)[]): string {
  const q = parts.filter(Boolean).join(' ').trim().split(/\s+/).map(encodeURIComponent).join('+');
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

/** Google search, the long-standing kura form ("+" between words). */
export function googleSearchUrl(...parts: (string | null | undefined)[]): string {
  const q = join(parts).split(' ').map(encodeURIComponent).join('+');
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

/** A place search link in whichever app the trip uses. */
export function placeUrl(apple: boolean, ...parts: (string | null | undefined)[]): string {
  return apple ? appleSearchUrl(join(parts)) : googleSearchUrl(...parts);
}

/** True for a map link the app is willing to store (verdicts). */
export function isMapsLink(url: string): boolean {
  return url.startsWith('https://www.google.com/maps/') || url.startsWith('https://maps.apple.com/');
}

/**
 * The `lang` for text shown to a driver, so CJK glyphs pick the right font:
 * Simplified on the mainland, Traditional in Hong Kong / Macau / Taiwan.
 */
export function driverLang(tz: string | null | undefined): 'ja' | 'zh-Hans' | 'zh-Hant' {
  if (tz === 'Asia/Shanghai') return 'zh-Hans';
  if (tz === 'Asia/Hong_Kong' || tz === 'Asia/Macau' || tz === 'Asia/Taipei') return 'zh-Hant';
  return 'ja';
}

/**
 * Which country's small touches a trip or day wears (stay stamps, season
 * names, weekday characters, the first and last line). Unlike `driverLang`,
 * an unknown zone is null: every trip outside Japan, China and Italy stays
 * undressed. Italy wears only a few of these; see `cjkDress`.
 * Use the day's `tz` where there is one, else the trip's.
 */
export type CjkDress = 'ja' | 'zh-Hans' | 'zh-Hant';
export type Dress = CjkDress | 'it' | null;

export function dressFor(tz: string | null | undefined): Dress {
  if (tz === 'Asia/Tokyo') return 'ja';
  if (tz === 'Europe/Rome') return 'it';
  if (tz === 'Asia/Shanghai') return 'zh-Hans';
  if (tz === 'Asia/Hong_Kong' || tz === 'Asia/Macau' || tz === 'Asia/Taipei') return 'zh-Hant';
  return null;
}

/**
 * The Japan / China dress only. Italy ('it', 2026-11-24) wears three touches:
 * the first and last line, the stay stamp, Italo on its ticket (plus the
 * glossary tips). Everything that draws characters, a season, a weekday or a
 * phrase or platform card takes this instead, so 'it' reads as an undressed
 * trip there and can never fall into a Chinese branch.
 */
export function cjkDress(dress: Dress): CjkDress | null {
  return dress === 'it' ? null : dress;
}
