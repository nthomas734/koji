// ─────────────────────────────────────────────────────────────────────────────
// LensMark — a lens drawn to its real length.
//
// The 40mm pancake is 45mm long and the 70-200 is 149mm. Scaling the barrel to
// the actual figure means the icon tells you what you are picking up, not just
// which one: in "carry today" the difference between a pancake and the zoom is
// the point, and a generic camera glyph would hide it.
// ─────────────────────────────────────────────────────────────────────────────

/** Physical length in mm, by lens label. Falls back to a middling barrel. */
const LENGTH_MM: Record<string, number> = {
  '24mm': 45,      // FE 24mm F2.8 G
  '40mm': 45,      // FE 40mm F2.5 G
  '50mm': 45,      // FE 50mm F2.5 G
  '85mm': 82,      // FE 85mm F1.8
  '35mm': 96,      // FE 35mm F1.4 GM
  '70-200mm': 149, // FE 70-200mm F4 Macro G OSS II
  '24-50mm': 92,
  '24-70mm': 120,
};

export function lensLength(lens: string): number {
  return LENGTH_MM[lens.trim()] ?? 70;
}

export function LensMark({
  lens, color = 'currentColor', height = 13,
}: {
  lens: string;
  color?: string;
  height?: number;
}) {
  const mm = lensLength(lens);
  // 45mm → 11px, 149mm → 30px. Linear, so the pancakes read as stubby and the
  // zoom reads as long, which is the whole point of drawing it at all.
  const barrel = Math.round(11 + ((mm - 45) / (149 - 45)) * 19);
  const W = barrel + 7;
  const H = 16;
  const cy = H / 2;
  const r = 5.4;

  return (
    <svg width={(W / H) * height} height={height} viewBox={`0 0 ${W} ${H}`}
         fill="none" aria-hidden style={{ display: 'block', flex: '0 0 auto' }}>
      {/* mount flange */}
      <rect x="0.8" y={cy - r - 1.4} width="2.4" height={(r + 1.4) * 2} rx="1" fill={color} />
      {/* barrel */}
      <rect x="3.2" y={cy - r} width={barrel} height={r * 2} rx="1.6" fill={color} opacity="0.85" />
      {/* front element */}
      <ellipse cx={barrel + 3.6} cy={cy} rx="3" ry={r + 0.6} fill={color} />
      <ellipse cx={barrel + 3.6} cy={cy} rx="1.5" ry={r - 1.8} fill="#F5F0E8" opacity="0.5" />
    </svg>
  );
}

/**
 * "70-200mm" + "200mm" → "70-200mm @ 200". Avoids printing mm twice while
 * keeping the lens name complete, which is how it gets said out loud.
 */
export function lensLabel(lens: string, focal: string | null): string {
  if (!focal) return lens;
  const trimmed = focal.trim().replace(/mm$/i, '');
  return `${lens} @ ${trimmed}`;
}

/**
 * Body weight in grams, by lens label. The carry card totals these, because
 * "all three" and "leave the zoom" are the same sentence until you see 1,338g
 * against 544g.
 */
const WEIGHT_G: Record<string, number> = {
  '24mm': 162,     // FE 24mm F2.8 G
  '40mm': 173,     // FE 40mm F2.5 G
  '50mm': 174,     // FE 50mm F2.5 G
  '85mm': 371,     // FE 85mm F1.8
  '35mm': 524,     // FE 35mm F1.4 GM
  '70-200mm': 794, // FE 70-200mm F4 Macro G OSS II, collar off
  '24-50mm': 440,
  '24-70mm': 695,
};

export function lensWeight(lens: string): number {
  return WEIGHT_G[lens.trim()] ?? 0;
}

/** Grams for a pocketable lens, kilos once it stops being one. */
export function fmtWeight(grams: number): string {
  return grams >= 1000 ? `${(grams / 1000).toFixed(2)}kg` : `${grams}g`;
}
