// ─────────────────────────────────────────────────────────────────────────────
// The season's name. Japan's old almanac names 72 short seasons (七十二候) of
// about five days; China's names 24 solar terms (節氣). Only the rows below
// exist, on purpose: they cover the trips that use them, and a date with no
// row returns null and shows nothing. Do not fill in the rest from memory.
//
// Japan's dates are the conventional fixed ones and repeat every year.
// The solar terms move by a day between years, so those rows carry their
// year. Checked against the Hong Kong Observatory's 2027 and 2028 calendars
// (hko.gov.hk/en/gts/time/calendar): 小雪 2027-11-22, 大雪 2027-12-07,
// 冬至 2027-12-22, 小寒 2028-01-06 (so 冬至 runs to Jan 5, not Jan 4).
// A China trip in another year needs its own rows.
// ─────────────────────────────────────────────────────────────────────────────

import type { Dress } from './maps';

export interface Season {
  local: string;
  english: string;
  /** YYYY-MM-DD, first day of the season */
  from: string;
  /** YYYY-MM-DD, last day */
  to: string;
}

// Japan: month-day ranges, any year
const KO: { from: string; to: string; local: string; english: string }[] = [
  { from: '02-04', to: '02-08', local: '東風解凍', english: 'East wind melts the ice' },
  { from: '02-09', to: '02-13', local: '黄鶯睍睆', english: 'Bush warblers start to sing' },
  { from: '02-14', to: '02-18', local: '魚上氷', english: 'Fish rise from the ice' },
  { from: '02-19', to: '02-23', local: '土脉潤起', english: 'Rain wets the soil' },
  { from: '02-24', to: '02-28', local: '霞始靆', english: 'Mist begins to hang' },
  { from: '03-01', to: '03-05', local: '草木萌動', english: 'Grass sprouts, trees bud' },
];

// China: full dates, per year
const JIEQI: Season[] = [
  { from: '2027-11-22', to: '2027-12-06', local: '小雪', english: 'Minor Snow' },
  { from: '2027-12-07', to: '2027-12-21', local: '大雪', english: 'Major Snow' },
  { from: '2027-12-22', to: '2028-01-05', local: '冬至', english: 'Winter Solstice' },
];

export function seasonFor(dress: Dress, isoDate: string): Season | null {
  if (!dress) return null;
  if (dress === 'ja') {
    const md = isoDate.slice(5);
    const y = isoDate.slice(0, 4);
    const k = KO.find(r => md >= r.from && md <= r.to);
    return k ? { local: k.local, english: k.english, from: `${y}-${k.from}`, to: `${y}-${k.to}` } : null;
  }
  return JIEQI.find(r => isoDate >= r.from && isoDate <= r.to) ?? null;
}

const MON = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

/** "FEB 14–18", "NOV 22 – DEC 6" */
export function seasonSpan(s: Season): string {
  const [, fm, fd] = s.from.split('-').map(Number);
  const [, tm, td] = s.to.split('-').map(Number);
  return fm === tm ? `${MON[fm - 1]} ${fd}–${td}` : `${MON[fm - 1]} ${fd} – ${MON[tm - 1]} ${td}`;
}
