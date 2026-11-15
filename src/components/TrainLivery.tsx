// ── TRAIN LIVERY ────────────────────────────────────────────────────────────
// Small touches that tell named Japanese trains apart on a journey ticket.
// The Tokaido shinkansen all run the same white-and-blue N700s, so the
// difference is borrowed from the station departure boards, which colour the
// name: Nozomi yellow, Hikari red, Kodama blue. Each also gets its own route
// line, from what the name means or what the train does:
//   Nozomi  long dashes and speed streaks: the fast one.
//   Hikari  a beam of light that brightens toward the arrival (ひかり, "light").
//   Kodama  a tick at every station along the line: the all-stops one.
//   Kamome  a gull over the line (かもめ, "seagull"), JR Kyushu's red on white.
//   Romancecar  a double stripe in Odakyu's rose vermilion.
//   Midori  JR Kyushu green (みどり, "green").
// A "Kodama + Nozomi" label splits the line: ticks, then dashes.
// Anything not listed keeps the plain dotted line.

export type LineKind = 'dots' | 'dash' | 'beam' | 'ticks' | 'gull' | 'stripe';

type Livery = { re: RegExp; line: LineKind; bg: string; fg: string; glow?: boolean };

const BOARD = '#17140F';
const LIVERIES: Livery[] = [
  { re: /nozomi|のぞみ/i, line: 'dash', bg: BOARD, fg: '#F6C744', glow: true },
  { re: /hikari|ひかり/i, line: 'beam', bg: BOARD, fg: '#FF5A4E', glow: true },
  { re: /kodama|こだま/i, line: 'ticks', bg: BOARD, fg: '#5AB1FF', glow: true },
  { re: /relay kamome|リレーかもめ/i, line: 'dots', bg: '#FFFFFF', fg: '#C8102E' },
  { re: /kamome|かもめ/i, line: 'gull', bg: '#FFFFFF', fg: '#C8102E' },
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

/** The service name set like a departure board: one small pill per train. */
export function ServicePills({ parts, lang, color }: { parts: LiveryPart[]; lang?: string; color: string }) {
  return (
    // Two trains stack like two rows of the board, first train on top.
    <span lang={lang} style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 3, marginBottom: 3, maxWidth: '100%' }}>
      {parts.map((p, i) => (
        <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, maxWidth: '100%' }}>
          {p.livery ? (() => {
            // Like the board: the kana in the pill, the romaji beside it.
            const m = p.text.match(/^([\p{Script=Hiragana}\p{Script=Katakana}ー・]+)\s+(.+)$/u);
            const pill = m ? m[1] : p.text;
            const after = m ? m[2] : '';
            return (
            <span style={{ display: 'inline-flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', columnGap: 5, rowGap: 1, maxWidth: '100%' }}>
            <span style={{
              display: 'inline-block', padding: '2px 7px 2px', borderRadius: 4, background: p.livery.bg, color: p.livery.fg,
              fontSize: 11, fontWeight: 600, letterSpacing: '0.02em', lineHeight: 1.25, textAlign: 'center',
              boxShadow: p.livery.bg === '#FFFFFF' ? `inset 0 0 0 1px color-mix(in srgb, ${p.livery.fg} 35%, transparent)` : undefined,
              whiteSpace: 'nowrap',
              textShadow: p.livery.glow ? `0 0 6px color-mix(in srgb, ${p.livery.fg} 55%, transparent)` : undefined,
            }}>{pill}</span>
            {after && <span style={{ fontSize: 11, fontWeight: 500, color, whiteSpace: 'nowrap' }}>{after}</span>}
            </span>
            );
          })() : <span style={{ fontSize: 11.5, fontWeight: 500, color }}>{p.text}</span>}
        </span>
      ))}
    </span>
  );
}

const SEG_H = 8;

/** One stretch of route line in a given style, vertically centred on its box. */
function Segment({ kind, accent }: { kind: LineKind; accent: string }) {
  const base: React.CSSProperties = { flex: 1, height: SEG_H, position: 'relative', minWidth: 0 };
  const mid = (extra: React.CSSProperties): React.CSSProperties => ({ position: 'absolute', left: 0, right: 0, top: '50%', transform: 'translateY(-50%)', ...extra });
  switch (kind) {
    case 'dash':
      return <div style={base}><div style={mid({ height: 1.5, background: `repeating-linear-gradient(90deg, ${accent} 0 9px, transparent 9px 13px)` })} /></div>;
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

/** Three streaks off the back of the train, for the Nozomi. */
export function SpeedStreaks() {
  return (
    <svg viewBox="0 0 18 10" width="18" height="10" aria-hidden="true" style={{ position: 'absolute', right: '100%', top: 3, marginRight: -4, opacity: 0.6 }}>
      <path d="M17 2h-9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M17 5h-15" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M17 8h-7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}
