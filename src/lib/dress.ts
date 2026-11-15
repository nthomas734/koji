// ─────────────────────────────────────────────────────────────────────────────
// The destination dress: small touches that appear only on Japan and China
// trips. `dressFor` (lib/maps.ts) decides which; this file holds what each
// dress looks like. No web fonts: the service worker does not cache
// cross-origin files, so a CJK web font would be missing offline abroad.
// System stacks plus a `lang` attribute pick the right glyphs instead.
// ─────────────────────────────────────────────────────────────────────────────

import type { Dress } from './maps';

export const JA_SERIF = "'Hiragino Mincho ProN', 'Yu Mincho', serif";
export const ZH_SERIF = "'Songti SC', 'STSong', 'Noto Serif CJK SC', serif";
const ZH_HANT_SERIF = "'Songti TC', 'Songti SC', 'STSong', 'Noto Serif CJK TC', 'Noto Serif CJK SC', serif";

export function cjkFont(dress: Exclude<Dress, null>): string {
  return dress === 'ja' ? JA_SERIF : dress === 'zh-Hant' ? ZH_HANT_SERIF : ZH_SERIF;
}

/** The name seal's cinnabar. Always this red, never the stay colour. */
export const CINNABAR = '#B5322A';

// The characters on "closed on" signs, Sunday first (Date.getDay order).
const WEEKDAY_JA = ['日', '月', '火', '水', '木', '金', '土'];
const WEEKDAY_ZH = ['日', '一', '二', '三', '四', '五', '六'];

export function weekdayChar(dress: Exclude<Dress, null>, isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const wd = new Date(y, m - 1, d).getDay();
  return (dress === 'ja' ? WEEKDAY_JA : WEEKDAY_ZH)[wd];
}

/** What people say at the door: on the way out (day 1) and coming home (the end). */
export function doorLine(dress: Exclude<Dress, null>, which: 'out' | 'home'): { local: string; reading: string } {
  if (dress === 'ja') return which === 'out'
    ? { local: '行ってきます', reading: 'itte kimasu' }
    : { local: 'ただいま', reading: 'tadaima' };
  return which === 'out'
    ? { local: '一路平安', reading: 'yí lù píng ān' }
    : { local: '到家了', reading: 'dào jiā le' };
}
