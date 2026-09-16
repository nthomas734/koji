// ─────────────────────────────────────────────────────────────────────────────
// KomaSketch — a composition diagram, drawn from a short spec on the row.
//
// For a shot you have never taken, a sketch says more than someone else's
// photograph: it shows the structure — what stacks behind what, where the
// subject sits, what fills the frame — rather than one person's execution of
// it. A real reference photo (ref_url) still wins when there is one.
//
// Spec:  kind[:a|b|c][;caption]
//   compression:back|mid|fore   three depth bands, the point being they stack
//   avenue                      a street compressed into a wall
//   ridges                      layered ridgelines separating in haze
//   tunnel                      repeating frames receding
//   rhythm:n|odd                repetition with one break
//   detail:cols|rows            a fragment filling the frame
//   macro                       one subject, everything else falling away
//   subject:note                small in frame, isolated by a long lens
// ─────────────────────────────────────────────────────────────────────────────

const BG = '#F5F0E8';
const COP = '#B83C01';
const INK = '#2A2620';
const SOFT = '#C9CFD6';
const MID = '#6B7280';
const MONO = 'ui-monospace, Menlo, monospace';

export function parseSketch(spec: string): { kind: string; args: string[]; caption: string } {
  const [head, ...capParts] = spec.split(';');
  const caption = capParts.join(';').trim();
  const [kind, argStr] = head.split(':');
  return {
    kind: kind.trim(),
    args: argStr ? argStr.split('|').map(a => a.trim()) : [],
    caption,
  };
}

export function KomaSketch({ spec, rounded = 9 }: { spec: string; rounded?: number }) {
  const { kind, args, caption } = parseSketch(spec);

  const body = (() => {
    switch (kind) {
      case 'compression': {
        const bands = [
          { y: 40,  h: 120, fill: SOFT, op: 0.95, label: args[0] ?? 'background' },
          { y: 150, h: 110, fill: MID,  op: 0.9,  label: args[1] ?? 'subject' },
          { y: 258, h: 92,  fill: INK,  op: 0.92, label: args[2] ?? 'foreground' },
        ];
        return (
          <>
            {bands.map((b, i) => (
              <g key={i}>
                <rect x="30" y={b.y} width="340" height={b.h} fill={b.fill} opacity={b.op} />
                <text x="46" y={b.y + 26} fontFamily={MONO} fontSize="14" fill={i === 2 ? BG : INK}>{b.label}</text>
              </g>
            ))}
            <path d="M382 44 L382 350" stroke={COP} strokeWidth="2" strokeDasharray="6 5" />
          </>
        );
      }
      case 'avenue':
        return (
          <>
            <path d="M30 358 L168 90 H232 L370 358 Z" fill={SOFT} opacity="0.45" />
            {[[34, 40, 200], [80, 34, 232], [292, 38, 214], [334, 36, 240]].map(([x, w, h], i) => (
              <rect key={i} x={x} y={358 - h} width={w} height={h} fill={MID} opacity={0.85 - i * 0.06} />
            ))}
            <rect x="150" y="150" width="46" height="150" fill={INK} opacity="0.8" />
            <rect x="206" y="168" width="40" height="132" fill={INK} opacity="0.65" />
            <rect x="186" y="306" width="30" height="18" rx="4" fill={COP} />
          </>
        );
      case 'ridges':
        return (
          <>
            {[[150, 0.28], [190, 0.44], [230, 0.62], [270, 0.82]].map(([y, op], i) => (
              <path key={i} fill={MID} opacity={op}
                d={`M30 ${y + 70} L100 ${y} L170 ${y + 34} L240 ${y - 8} L310 ${y + 40} L370 ${y + 12} L370 358 L30 358 Z`} />
            ))}
          </>
        );
      case 'tunnel':
        return (
          <>
            {[1, 0.78, 0.6, 0.45, 0.33].map((s, i) => (
              <rect key={i} x={200 - (300 * s) / 2} y={190 - (250 * s) / 2}
                    width={300 * s} height={250 * s} fill="none"
                    stroke={i === 0 ? COP : MID} strokeWidth={i === 0 ? 2.4 : 1.6}
                    opacity={1 - i * 0.13} />
            ))}
          </>
        );
      case 'rhythm': {
        const n = Number(args[0] ?? 6);
        const odd = Number(args[1] ?? 3);
        const gap = 340 / n;
        return (
          <>
            {Array.from({ length: n }, (_, i) => {
              const isOdd = i === odd;
              return (
                <rect key={i} x={30 + i * gap + gap * 0.18} y="60" width={gap * 0.64} height="250"
                      fill={isOdd ? COP : 'none'} stroke={isOdd ? COP : MID}
                      strokeWidth={isOdd ? 2.4 : 1.8} />
              );
            })}
          </>
        );
      }
      case 'detail': {
        const cols = Number(args[0] ?? 4);
        const rows = Number(args[1] ?? 4);
        const cw = 340 / cols;
        const ch = 344 / rows;
        return (
          <>
            {Array.from({ length: rows * cols }, (_, i) => {
              const r = Math.floor(i / cols);
              const c = i % cols;
              return (
                <rect key={i} x={30 + c * cw + 4} y={14 + r * ch + 4}
                      width={cw - 8} height={ch - 8} fill="none" stroke={MID} strokeWidth="1.6" />
              );
            })}
          </>
        );
      }
      case 'macro':
        return (
          <>
            <circle cx="200" cy="186" r="150" fill={SOFT} opacity="0.5" />
            <circle cx="200" cy="186" r="96" fill={MID} opacity="0.35" />
            <circle cx="200" cy="186" r="52" fill={INK} />
            <path d="M50 330 H350" stroke={COP} strokeWidth="2" />
          </>
        );
      case 'subject':
        return (
          <>
            <rect x="30" y="40" width="340" height="270" fill={SOFT} opacity="0.55" />
            <circle cx="200" cy="180" r="17" fill={INK} />
            <rect x="192" y="196" width="16" height="42" rx="5" fill={INK} />
            <circle cx="200" cy="180" r="46" fill="none" stroke={COP} strokeWidth="2" strokeDasharray="5 5" />
            {args[0] && (
              <text x="200" y="300" textAnchor="middle" fontFamily={MONO} fontSize="13" fill={MID}>{args[0]}</text>
            )}
          </>
        );
      default:
        return null;
    }
  })();

  if (!body) return null;

  return (
    <svg viewBox="0 0 400 400" width="100%" height="100%" role="img"
         aria-label={caption || `${kind} composition sketch`}
         style={{ display: 'block', borderRadius: rounded, background: BG }}>
      <rect width="400" height="400" fill={BG} />
      <rect x="14" y="14" width="372" height="344" fill="none" stroke={COP} strokeWidth="2.5" />
      {body}
      {caption && (
        <text x="200" y="384" textAnchor="middle" fontFamily={MONO} fontSize="15" fill={INK}>{caption}</text>
      )}
    </svg>
  );
}
