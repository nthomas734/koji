// ── TRAIN LIVERY ────────────────────────────────────────────────────────────
// Small touches that tell named Japanese trains apart on a journey ticket:
// a coloured dot beside the train's name in the tag row, and a route line.
// The Tokaido shinkansen all run the same white-and-blue N700s, so the
// difference is borrowed from the station departure boards, which colour the
// name: Nozomi yellow, Hikari red, Kodama blue. Each also gets its own route
// line, from what the name means or what the train does:
//   Every bullet train trails speed streaks off the back of the glyph.
//   Nozomi  a run of forward chevrons: the fast one, pointing on ahead.
//   Hikari  a beam of light that brightens toward the arrival (ひかり, "light").
//   Kodama  a tick at every station along the line: the all-stops one.
//   Kamome  a gull over the line (かもめ, "seagull"), JR Kyushu's red on white.
//   Romancecar  a double stripe in Odakyu's rose vermilion.
//   Midori  JR Kyushu green (みどり, "green").
// A "Kodama + Nozomi" label splits the line: ticks, then dashes.
// Anything not listed keeps the plain dotted line.

import { glossOf } from '@/lib/glossary';

export type LineKind = 'dots' | 'chevron' | 'beam' | 'ticks' | 'gull' | 'stripe';

type Livery = { re: RegExp; line: LineKind; bg: string; fg: string; glow?: boolean; bullet?: boolean };

const BOARD = '#17140F';
const LIVERIES: Livery[] = [
  { re: /nozomi|のぞみ/i, line: 'chevron', bg: BOARD, fg: '#F6C744', glow: true, bullet: true },
  { re: /hikari|ひかり/i, line: 'beam', bg: BOARD, fg: '#FF5A4E', glow: true, bullet: true },
  { re: /kodama|こだま/i, line: 'ticks', bg: BOARD, fg: '#5AB1FF', glow: true, bullet: true },
  { re: /relay kamome|リレーかもめ/i, line: 'dots', bg: '#FFFFFF', fg: '#C8102E' },
  { re: /kamome|かもめ/i, line: 'gull', bg: '#FFFFFF', fg: '#C8102E', bullet: true },
  { re: /romancecar|ロマンスカー/i, line: 'stripe', bg: '#D9512C', fg: '#FFFFFF' },
  { re: /midori|みどり/i, line: 'dots', bg: '#2E8B57', fg: '#FFFFFF' },
  { re: /huis ten bosch|ハウステンボス/i, line: 'dots', bg: '#E8761B', fg: '#FFFFFF' },
];

export type LiveryPart = { text: string; livery: Livery | null };

/** The label's parts ("こだま Kodama + のぞみ Nozomi" is two), each with its livery. */
export function liveryParts(service: string): LiveryPart[] {
  if (!service) return [];
  return service.split(/\s*\+\s*/).map(text => ({ text, livery: LIVERIES.find(l => l.re.test(text)) ?? null }));
}

/** True when the ticket should wear any of these touches. */
export function hasLivery(parts: LiveryPart[]): boolean {
  return parts.some(p => p.livery);
}

/** The train's colour on the departure board, for the small dot beside its name. */
function dotColor(l: Livery): string {
  return l.bg === BOARD || l.bg === '#FFFFFF' ? l.fg : l.bg;
}

/**
 * Which train this is, as a quiet note beside the ticket's tag: a dot in the
 * board's colour, the name in romaji, and what kind of train it is
 * ("● Hikari · semi-fast bullet train"). The kana are dropped here.
 */
export function TrainNote({ parts, kind, color, glossed = false }: {
  parts: LiveryPart[]; kind: string; color: string;
  /** Japan trips: the train's name taps open its glossary line, like the body text. */
  glossed?: boolean;
}) {
  const romaji = (t: string) => t.replace(/^[\p{Script=Hiragana}\p{Script=Katakana}ー・]+\s+/u, '');
  // Plain inline text, not flex, so it sits on the tag's baseline.
  return (
    <span style={{
      minWidth: 0, fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 500, lineHeight: 1.3,
      letterSpacing: 0, textTransform: 'none', color,
    }}>
      {parts.map((p, i) => {
        const name = romaji(p.text);
        const def = glossed ? glossOf(name.replace(/\s+\d+$/, '')) : undefined;
        return (
          <span key={i} style={{ whiteSpace: 'nowrap' }}>
            {i > 0 && <span style={{ opacity: 0.5, margin: '0 6px' }}>→</span>}
            {p.livery && <span aria-hidden style={{
              display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: dotColor(p.livery),
              boxShadow: '0 0 0 1px rgba(0, 0, 0, 0.12)', marginRight: 5, verticalAlign: '0.05em',
            }} />}
            {def ? <span className="gl" role="button" tabIndex={0} data-gl={def}>{name}</span> : name}
          </span>
        );
      })}
      {kind && <span style={{ opacity: 0.65, fontWeight: 400, whiteSpace: 'nowrap', marginLeft: 6 }}>· {kind}</span>}
    </span>
  );
}

const SEG_H = 8;

const CHEVRON_SVG = `url("data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="9" height="7" viewBox="0 0 9 7"><path d="M2.5 1 L5.5 3.5 L2.5 6" fill="none" stroke="#000" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>')}")`;
const CHEVRONS: React.CSSProperties = {
  WebkitMaskImage: CHEVRON_SVG, maskImage: CHEVRON_SVG,
  WebkitMaskRepeat: 'repeat-x', maskRepeat: 'repeat-x',
  WebkitMaskSize: '9px 7px', maskSize: '9px 7px',
};

/** One stretch of route line in a given style, vertically centred on its box. */
function Segment({ kind, accent }: { kind: LineKind; accent: string }) {
  const base: React.CSSProperties = { flex: 1, height: SEG_H, position: 'relative', minWidth: 0 };
  const mid = (extra: React.CSSProperties): React.CSSProperties => ({ position: 'absolute', left: 0, right: 0, top: '50%', transform: 'translateY(-50%)', ...extra });
  switch (kind) {
    case 'chevron':
      // The Nozomi's own: a run of small forward chevrons, the line itself
      // pointing on ahead, since it's the one that doesn't stop.
      return <div style={base}><div style={mid({ height: 7, background: accent, ...CHEVRONS })} /></div>;
    case 'beam':
      return <div style={base}><div style={mid({ height: 2, borderRadius: 2, background: `linear-gradient(90deg, transparent, ${accent} 70%, ${accent})`, boxShadow: `0 0 6px color-mix(in srgb, ${accent} 45%, transparent)` })} /></div>;
    case 'ticks':
      return (
        <div style={base}>
          <div style={mid({ height: 1.5, background: accent })} />
          <div style={mid({ height: 7, background: `repeating-linear-gradient(90deg, transparent 0 5px, ${accent} 5px 6.5px, transparent 6.5px 12px)` })} />
        </div>
      );
    case 'stripe':
      return <div style={base}><div style={mid({ height: 5, borderTop: `1.5px solid ${accent}`, borderBottom: `1.5px solid ${accent}` })} /></div>;
    default:
      return <div style={base}><div style={mid({ borderTop: `1.5px dotted ${accent}` })} /></div>;
  }
}

/** The route line for a liveried ticket: one segment per part of the label. */
export function LiveryLine({ parts, accent, top }: { parts: LiveryPart[]; accent: string; top: number }) {
  const kinds = parts.map(p => p.livery?.line ?? 'dots');
  // The Romancecar's stripe is its own rose vermilion; the rest take the day's colour.
  const colorOf = (i: number) => kinds[i] === 'stripe' ? parts[i].livery!.bg : accent;
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, top: top - SEG_H / 2, display: 'flex', opacity: 0.75 }}>
      {kinds.map((k, i) => <Segment key={i} kind={k === 'gull' ? 'dots' : k} accent={colorOf(i)} />)}
      {kinds.includes('gull') && <Gull />}
    </div>
  );
}

/** Two gulls riding the air over the first stretch of the line. */
function Gull() {
  const bird = (left: string, top: number, w: number, o: number) => (
    <svg viewBox="0 0 20 8" width={w} height={w * 0.4} aria-hidden="true" style={{ position: 'absolute', left, top, opacity: o }}>
      <path d="M1 3.2 Q5.5 0.2 10 6.6 Q14.5 0.2 19 3.2" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
  return <>{bird('10%', -12, 17, 0.9)}{bird('24%', -7, 11, 0.6)}</>;
}

/** Three streaks off the back of the train, for every bullet train. */
export function SpeedStreaks() {
  return (
    <svg viewBox="0 0 18 10" width="18" height="10" aria-hidden="true" style={{ position: 'absolute', right: '100%', top: 3, marginRight: -4, opacity: 0.6 }}>
      <path d="M17 2h-9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M17 5h-15" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M17 8h-7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}
