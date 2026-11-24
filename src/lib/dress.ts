// ─────────────────────────────────────────────────────────────────────────────
// The destination dress: small touches that appear only on Japan, China and
// (fewer of them) Italy trips. `dressFor` (lib/maps.ts) decides which; this
// file holds what each dress looks like. No web fonts: the service worker does not cache
// cross-origin files, so a CJK web font would be missing offline abroad.
// System stacks plus a `lang` attribute pick the right glyphs instead.
// ─────────────────────────────────────────────────────────────────────────────

import type { CjkDress, Dress } from './maps';

export const JA_SERIF = "'Hiragino Mincho ProN', 'Yu Mincho', serif";
export const ZH_SERIF = "'Songti SC', 'STSong', 'Noto Serif CJK SC', serif";
const ZH_HANT_SERIF = "'Songti TC', 'Songti SC', 'STSong', 'Noto Serif CJK TC', 'Noto Serif CJK SC', serif";

export function cjkFont(dress: CjkDress): string {
  return dress === 'ja' ? JA_SERIF : dress === 'zh-Hant' ? ZH_HANT_SERIF : ZH_SERIF;
}

/** The name seal's cinnabar. Always this red, never the stay colour. */
export const CINNABAR = '#B5322A';

// The characters on "closed on" signs, Sunday first (Date.getDay order).
const WEEKDAY_JA = ['日', '月', '火', '水', '木', '金', '土'];
const WEEKDAY_ZH = ['日', '一', '二', '三', '四', '五', '六'];

export function weekdayChar(dress: CjkDress, isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const wd = new Date(y, m - 1, d).getDay();
  return (dress === 'ja' ? WEEKDAY_JA : WEEKDAY_ZH)[wd];
}

/**
 * What people say at the door: on the way out (day 1) and coming home (the
 * end). Italian needs no reading line: "Bentornati" is the plural, welcome
 * back, both of you.
 */
export function doorLine(dress: Exclude<Dress, null>, which: 'out' | 'home'): { local: string; reading: string | null } {
  if (dress === 'it') return { local: which === 'out' ? 'Buon viaggio' : 'Bentornati', reading: null };
  if (dress === 'ja') return which === 'out'
    ? { local: '行ってきます', reading: 'itte kimasu' }
    : { local: 'ただいま', reading: 'tadaima' };
  return which === 'out'
    ? { local: '一路平安', reading: 'yí lù píng ān' }
    : { local: '到家了', reading: 'dào jiā le' };
}

// Italian month abbreviations, as a date stamp prints them ("25 MAG 2026").
const MESI = ['GEN', 'FEB', 'MAR', 'APR', 'MAG', 'GIU', 'LUG', 'AGO', 'SET', 'OTT', 'NOV', 'DIC'];

/** "2026-05-25" → "25 MAG 2026", for Italy's oval stay stamp. */
export function italianStampDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  return `${d} ${MESI[m - 1]} ${y}`;
}
