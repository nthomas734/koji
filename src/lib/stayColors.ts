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
