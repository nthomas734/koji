// Stay colours, shared by the trip page (components/Stays.tsx, a client
// module) and the server-rendered home page, so they live outside both.
import type { StayColor } from '@/lib/supabase';

// ink sits on parchment; light sits on a dark hero.
export const STAY_PALETTE: Record<StayColor, { ink: string; light: string }> = {
  blue:   { ink: '#3E5F99', light: '#9DB8E8' },
  green:  { ink: '#3F7A55', light: '#9ED3B0' },
  violet: { ink: '#6A548F', light: '#C8B6EA' },
  rose:   { ink: '#A84A6A', light: '#F2A9C2' },
  teal:   { ink: '#2E7680', light: '#8FD3DB' },
  red:    { ink: '#A33E3E', light: '#F2A3A3' },
  amber:  { ink: '#9A6420', light: '#F0C987' },
  olive:  { ink: '#66702A', light: '#C6CF80' },
};

/** A light hero (linen, stone, marigold, pewter) needs the ink colours, not the light ones. */
export function heroIsLight(bg: string): boolean {
  const h = bg.replace('#', '');
  const [r, g, b] = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.45;
}

// ── Readable names on the home cards ────────────────────────────────────────
// The home list sets each stay's name in its colour on the trip's own card,
// and several palette colours sit under 4.5:1 there (cobalt 2.5-3.3, lacquer
// 4.0-4.3 for blue, red, rose, violet). So the list, and only the list, nudges
// each name toward white on a dark card (toward ink on a light one) by the
// least that reaches 4.5:1, stopping at a cap so it still reads as the hue of
// its bar segment. The palette, the bar and the trip page are untouched.

const AA = 4.5;
/** Most of the way a name may move off its stay colour (tuned by eye on cobalt). */
export const NAME_MIX_CAP = 0.30;

function rgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
}
function luminance(hex: string): number {
  const [r, g, b] = rgb(hex).map(v => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export function contrast(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}
function mix(a: string, b: string, t: number): string {
  const [p, q] = [rgb(a), rgb(b)];
  return '#' + p.map((v, i) => Math.round(v * (1 - t) + q[i] * t).toString(16).padStart(2, '0')).join('').toUpperCase();
}

/** `color` moved toward white (dark card) or ink (light card) until it reads on `bg`, at most `cap`. */
export function readableOn(color: string, bg: string, light: boolean, cap = NAME_MIX_CAP): string {
  const toward = light ? '#1C1A16' : '#FFFFFF';
  for (let i = 0; i <= Math.round(cap * 100); i++) {
    const c = mix(color, toward, i / 100);
    if (contrast(c, bg) >= AA) return c;
  }
  return mix(color, toward, cap);
}
