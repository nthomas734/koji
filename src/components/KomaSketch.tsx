// ─────────────────────────────────────────────────────────────────────────────
// KomaSketch — a composition diagram, drawn from a short spec on the row.
//
// For a shot you have never taken, a sketch says more than someone else's
// photograph: it shows the structure — what stacks behind what, where the
// subject sits, what fills the frame — rather than one person's execution of
// it. A real reference photo (ref_url) still wins when there is one.
//
// The rule this file exists to enforce, having broken it once: **two different
// pictures must not get the same drawing.** The first version had one `macro`
// bullseye standing in for a rose, a pair of hands, a seam of rivets and moving
// water, and one `subject` person-glyph standing in for cattle, a deer, a tree
// and a plume of steam. A diagram that cannot tell those apart is decoration.
// If a frame does not fit an archetype here, add one rather than borrowing the
// nearest — the whole value is in being specific.
//
// Every archetype also annotates itself in-frame. The caption underneath is a
// reminder, not the explanation; the picture has to carry the instruction.
//
// Spec:  kind[:a|b|c][;caption]
//
//   Depth and distance
//     compression:back|mid|fore   three labelled depth bands that stack
//     avenue                      a street compressed into a wall
//     ridges                      layered ridgelines separating in haze
//     wall                        a wall or hedge raking away across a slope
//
//   Structure you stand inside
//     corridor                    arches receding down a walk
//     lookup                      straight up a well or atrium
//     radial:n                    ribs radiating from a centre, shot dead on
//
//   Repetition
//     rhythm:n|odd                n uprights, one of them the break
//     grid:cols|rows              tessellation, where the repeat is the subject
//
//   Filling the frame
//     fill                        a form bleeding past all four edges
//     round                       a round subject, everything falling away
//     seam                        a line of repeats running out of frame
//     crop                        the frame cutting a larger form
//
//   A subject in a space
//     subject:kind|note           kind = person|group|animal|bird|tree|plume
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

/** Small in-frame annotation — the diagram states its own instruction. */
function Note({ x, y, children, fill = COP }: {
  x: number; y: number; children: string; fill?: string;
}) {
  return (
    <text x={x} y={y} textAnchor="middle" fontFamily={MONO} fontSize="13" fill={fill}>{children}</text>
  );
}

// ── subject glyphs ───────────────────────────────────────────────────────────
// Drawn around (0,0) at a common scale so `subject` can place any of them.

function Glyph({ kind }: { kind: string }) {
  switch (kind) {
    case 'animal': // a quadruped at distance — deer, cattle
      return (
        <g fill={INK}>
          <rect x="-20" y="-6" width="40" height="17" rx="5" />
          <rect x="-16" y="9" width="5" height="16" rx="2" />
          <rect x="-6" y="9" width="5" height="16" rx="2" />
          <rect x="6" y="9" width="5" height="16" rx="2" />
          <rect x="15" y="9" width="5" height="16" rx="2" />
          <rect x="16" y="-17" width="7" height="15" rx="3" />
          <circle cx="21" cy="-20" r="7" />
          <path d="M18 -26 l-5 -10 M25 -26 l5 -10" stroke={INK} strokeWidth="2.6" strokeLinecap="round" />
        </g>
      );
    case 'bird':
      return (
        <g fill={INK}>
          <ellipse cx="0" cy="2" rx="22" ry="13" />
          <circle cx="16" cy="-12" r="8" />
          <path d="M23 -12 L38 -8" stroke={INK} strokeWidth="4" strokeLinecap="round" />
          <path d="M-22 2 L-40 -6" stroke={INK} strokeWidth="4" strokeLinecap="round" />
        </g>
      );
    case 'tree':
      return (
        <g>
          <rect x="-4" y="-2" width="8" height="34" fill={INK} />
          <path d="M0 -42 C 28 -36 32 -8 0 -4 C -32 -8 -28 -36 0 -42 Z" fill={INK} opacity="0.88" />
        </g>
      );
    case 'plume': // steam, smoke — rising and formless
      return (
        <g fill="none" stroke={INK} strokeWidth="3.4" strokeLinecap="round" opacity="0.9">
          <path d="M-10 28 C -18 6 -2 2 -8 -14 C -12 -26 -2 -30 -2 -42" />
          <path d="M8 28 C 2 8 16 4 10 -12 C 6 -22 14 -26 14 -36" />
        </g>
      );
    case 'group':
      return (
        <g fill={INK}>
          {[-28, 0, 28].map((dx, i) => (
            <g key={i} opacity={1 - i * 0.12}>
              <circle cx={dx} cy="-12" r="7" />
              <rect x={dx - 6} y="-1" width="12" height="28" rx="4" />
            </g>
          ))}
        </g>
      );
    default: // person
      return (
        <g fill={INK}>
          <circle cx="0" cy="-14" r="9" />
          <rect x="-8" y="-2" width="16" height="34" rx="5" />
        </g>
      );
  }
}

export function KomaSketch({ spec, rounded = 9 }: { spec: string; rounded?: number }) {
  const { kind, args, caption } = parseSketch(spec);

  const body = (() => {
    switch (kind) {
      // ── depth and distance ────────────────────────────────────────────────
      case 'compression': {
        // Unlabelled bands say "three greys". The labels are the information.
        const labels = args.length >= 3 ? args : ['furthest', 'the subject', 'nearest'];
        const bands = [
          { y: 52, h: 116, fill: SOFT, op: 0.95 },
          { y: 158, h: 106, fill: MID, op: 0.9 },
          { y: 254, h: 94, fill: INK, op: 0.92 },
        ];
        return (
          <>
            {bands.map((b, i) => (
              <g key={i}>
                <rect x="30" y={b.y} width="318" height={b.h} fill={b.fill} opacity={b.op} />
                <text x="44" y={b.y + 26} fontFamily={MONO} fontSize="14" fill={i === 2 ? BG : INK}>
                  {labels[i]}
                </text>
              </g>
            ))}
            {/* the long lens is what shuts the gaps between them */}
            <path d="M360 56 L360 344" stroke={COP} strokeWidth="2" />
            <path d="M353 56 L367 56 M353 344 L367 344" stroke={COP} strokeWidth="2" />
            <Note x={200} y={40}>they overlap — no sky between</Note>
          </>
        );
      }
      case 'avenue':
        return (
          <>
            <path d="M30 348 L168 96 H232 L370 348 Z" fill={SOFT} opacity="0.45" />
            {[[34, 40, 190], [80, 34, 222], [292, 38, 204], [334, 36, 230]].map(([x, w, h], i) => (
              <rect key={i} x={x} y={348 - h} width={w} height={h} fill={MID} opacity={0.85 - i * 0.06} />
            ))}
            <rect x="150" y="152" width="46" height="144" fill={INK} opacity="0.8" />
            <rect x="206" y="170" width="40" height="126" fill={INK} opacity="0.65" />
            <rect x="186" y="300" width="30" height="18" rx="4" fill={COP} />
            <Note x={200} y={42}>stand in the street, not beside it</Note>
          </>
        );
      case 'ridges':
        return (
          <>
            {[[160, 0.28], [198, 0.44], [236, 0.62], [274, 0.82]].map(([y, op], i) => (
              <path key={i} fill={MID} opacity={op}
                d={`M30 ${y + 70} L100 ${y} L170 ${y + 34} L240 ${y - 8} L310 ${y + 40} L370 ${y + 12} L370 350 L30 350 Z`} />
            ))}
            <Note x={200} y={72}>haze separates them — each paler than the last</Note>
          </>
        );
      case 'wall':
        // A wall running away across a slope. Emphatically not a mountain range.
        return (
          <>
            <path d="M14 296 C 120 266 250 248 386 232 L386 350 L14 350 Z" fill={SOFT} opacity="0.6" />
            <path d="M14 334 C 130 296 250 214 386 172" fill="none" stroke={INK} strokeWidth="9"
                  strokeLinecap="round" opacity="0.9" />
            <path d="M14 334 C 130 296 250 214 386 172" fill="none" stroke={BG} strokeWidth="1.6"
                  strokeDasharray="3 13" />
            {[[70, 250], [142, 216], [216, 184], [292, 158]].map(([x, y], i) => (
              <path key={i} d={`M${x} ${y} l32 -26`} stroke={COP} strokeWidth="2" opacity="0.8" />
            ))}
            <Note x={200} y={64}>low sun raking across the stone</Note>
            <Note x={200} y={92} fill={MID}>enters low, leaves at the far edge</Note>
          </>
        );

      // ── structure you stand inside ────────────────────────────────────────
      case 'corridor': {
        // Nested squares read as "nested squares". This reads as somewhere you
        // can walk, which is the whole instruction: stand at one end.
        const vpx = 200, vpy = 206;
        return (
          <>
            <path d="M22 350 L200 218 L378 350 Z" fill={SOFT} opacity="0.4" />
            {[0, 1, 2, 3, 4].map(i => {
              const s = 1 - i * 0.185;
              const w = 148 * s, h = 142 * s;
              return (
                <path key={i}
                  d={`M${vpx - w} ${vpy + h} V${vpy - h * 0.2} a${w} ${w * 0.92} 0 0 1 ${w * 2} 0 V${vpy + h}`}
                  fill="none" stroke={i === 0 ? COP : MID} strokeWidth={i === 0 ? 2.6 : 1.8}
                  opacity={1 - i * 0.14} />
              );
            })}
            <path d="M52 348 L200 216 M348 348 L200 216" stroke={MID} strokeWidth="1.2"
                  strokeDasharray="5 6" opacity="0.8" />
            <Note x={200} y={46}>stand at one end, on the centre line</Note>
          </>
        );
      }
      case 'lookup':
        // Straight up a well. Deliberately not the corridor drawing: the
        // corners run out to the frame instead of down to a floor.
        return (
          <>
            <path d="M16 16 L142 146 M384 16 L258 146 M16 356 L142 254 M384 356 L258 254"
                  stroke={MID} strokeWidth="1.4" strokeDasharray="5 6" opacity="0.9" />
            {[1, 0.74, 0.52, 0.34].map((s, i) => (
              <rect key={i} x={200 - 170 * s} y={200 - 152 * s} width={340 * s} height={304 * s}
                    fill="none" stroke={i === 0 ? COP : MID} strokeWidth={i === 0 ? 2.6 : 1.8}
                    opacity={1 - i * 0.16} />
            ))}
            <circle cx="200" cy="200" r="22" fill={SOFT} opacity="0.9" />
            <Note x={200} y={205} fill={MID}>sky</Note>
            <Note x={200} y={344}>flat on your back, dead centre</Note>
          </>
        );
      case 'radial': {
        const n = Math.max(4, Math.min(16, Number(args[0] ?? 8)));
        return (
          <>
            {[142, 100, 58].map((r, i) => (
              <circle key={i} cx="200" cy="186" r={r} fill="none" stroke={MID}
                      strokeWidth={i === 0 ? 2.2 : 1.6} opacity={0.85 - i * 0.15} />
            ))}
            {Array.from({ length: n }, (_, i) => {
              const a = (i / n) * Math.PI * 2;
              return (
                <path key={i} stroke={INK} strokeWidth="2.2" opacity="0.8"
                      d={`M${200 + 24 * Math.cos(a)} ${186 + 24 * Math.sin(a)} L${200 + 142 * Math.cos(a)} ${186 + 142 * Math.sin(a)}`} />
              );
            })}
            <circle cx="200" cy="186" r="22" fill={COP} />
            <path d="M200 40 L200 332 M56 186 L344 186" stroke={COP} strokeWidth="1"
                  strokeDasharray="4 7" opacity="0.55" />
            <Note x={200} y={344}>off centre and it reads as a mistake</Note>
          </>
        );
      }

      // ── repetition ────────────────────────────────────────────────────────
      case 'rhythm': {
        const n = Math.max(2, Number(args[0] ?? 6));
        const odd = Number(args[1] ?? 3);
        const gap = 340 / n;
        return (
          <>
            {Array.from({ length: n }, (_, i) => {
              const isOdd = i === odd;
              return (
                <rect key={i} x={30 + i * gap + gap * 0.18} y="66" width={gap * 0.64} height="240"
                      fill={isOdd ? COP : 'none'} stroke={isOdd ? COP : MID}
                      strokeWidth={isOdd ? 2.4 : 1.8} />
              );
            })}
            <Note x={200} y={46} fill={MID}>run them past both edges</Note>
            <Note x={200} y={336}>one break carries the picture</Note>
          </>
        );
      }
      case 'grid': {
        const cols = Math.max(3, Number(args[0] ?? 6));
        const rows = Math.max(3, Number(args[1] ?? 6));
        const cw = 372 / cols;
        const ch = 310 / rows;
        return (
          <>
            {Array.from({ length: rows * cols }, (_, i) => {
              const r = Math.floor(i / cols);
              const c = i % cols;
              const hot = (r * cols + c) % 7 === 3;
              return (
                <rect key={i} x={14 + c * cw + 1.5} y={14 + r * ch + 1.5}
                      width={cw - 3} height={ch - 3}
                      fill={hot ? COP : MID} opacity={hot ? 0.75 : 0.28} />
              );
            })}
            <Note x={200} y={344} fill={MID}>the repeat is the subject, square on</Note>
          </>
        );
      }

      // ── filling the frame ─────────────────────────────────────────────────
      case 'fill':
        // A form with no edge inside the frame. Says "fill it" without
        // implying the subject is round, which the old bullseye did.
        return (
          <>
            <path d="M-20 72 C 90 32 150 156 230 98 C 300 48 360 126 420 90 L420 300
                     C 350 264 300 338 220 292 C 140 248 80 344 -20 300 Z"
                  fill={MID} opacity="0.38" />
            <path d="M-20 72 C 90 32 150 156 230 98 C 300 48 360 126 420 90"
                  fill="none" stroke={INK} strokeWidth="3" />
            <path d="M-20 300 C 80 344 140 248 220 292 C 300 338 350 264 420 300"
                  fill="none" stroke={INK} strokeWidth="3" />
            <path d="M14 168 L14 232 M386 168 L386 232" stroke={COP} strokeWidth="3.5" />
            <Note x={200} y={204}>no edge inside the frame</Note>
            <Note x={200} y={344} fill={MID}>the whole is implied, not shown</Note>
          </>
        );
      case 'round':
        return (
          <>
            <circle cx="200" cy="182" r="142" fill={SOFT} opacity="0.5" />
            <circle cx="200" cy="182" r="92" fill={MID} opacity="0.35" />
            <circle cx="200" cy="182" r="50" fill={INK} />
            <path d="M42 182 h38 M320 182 h38" stroke={COP} strokeWidth="2.4" />
            <Note x={200} y={348} fill={MID}>one plane sharp, everything else gone</Note>
          </>
        );
      case 'seam':
        // A line of repeats leaving the frame at both ends — rivets, tesserae
        // along an edge, lichen along a slate. Not a bullseye.
        return (
          <>
            <rect x="14" y="152" width="372" height="96" fill={MID} opacity="0.18" />
            <path d="M14 152 H386 M14 248 H386" stroke={MID} strokeWidth="2.4" opacity="0.75" />
            {Array.from({ length: 9 }, (_, i) => (
              <circle key={i} cx={2 + i * 48} cy="200" r="14" fill={INK} opacity="0.85" />
            ))}
            <path d="M14 162 L14 238 M386 162 L386 238" stroke={COP} strokeWidth="3.5" />
            <Note x={200} y={116}>running out of frame both ways</Note>
            <Note x={200} y={300} fill={MID}>square on, or it stops being a pattern</Note>
          </>
        );
      case 'crop':
        return (
          <>
            <path d="M60 358 V150 a140 140 0 0 1 280 0 V358 Z" fill={SOFT} opacity="0.5" />
            <path d="M60 358 V150 a140 140 0 0 1 280 0 V358" fill="none" stroke={MID} strokeWidth="3" />
            <path d="M160 358 V178 a40 40 0 0 1 80 0 V358" fill="none" stroke={INK} strokeWidth="2.4" />
            <path d="M14 100 H386" stroke={COP} strokeWidth="2" strokeDasharray="6 5" />
            <Note x={200} y={88}>the frame stops here</Note>
            <Note x={200} y={330} fill={MID}>one part, standing for the whole</Note>
          </>
        );

      // ── a subject in a space ──────────────────────────────────────────────
      case 'subject': {
        const kinds = ['person', 'group', 'animal', 'bird', 'tree', 'plume'];
        const glyphKind = kinds.includes(args[0]) ? args[0] : 'person';
        // `near` is the opposite instruction: the subject fills the frame. A
        // raven at 200mm and a figure three blocks away are not the same
        // picture and must not get the same drawing.
        const near = args.includes('near');
        const note = args.filter(a => a !== glyphKind && a !== 'near')[0];
        const scale = near ? 3.1 : 1;
        return (
          <>
            <rect x="30" y="52" width="340" height="252" fill={SOFT} opacity={near ? 0.35 : 0.55} />
            <g transform={`translate(200 ${near ? 196 : 186}) scale(${scale})`}>
              <Glyph kind={glyphKind} />
            </g>
            {!near && (
              <circle cx="200" cy="186" r="58" fill="none" stroke={COP} strokeWidth="2" strokeDasharray="5 5" />
            )}
            {near && <path d="M14 168 L14 232 M386 168 L386 232" stroke={COP} strokeWidth="3.5" />}
            <Note x={200} y={42} fill={MID}>
              {near ? 'it fills the frame — crop the setting out' : 'small in frame, and it still reads'}
            </Note>
            {note && <Note x={200} y={336}>{note}</Note>}
          </>
        );
      }
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
        <>
          {/* its own band — a caption printed over the drawing is unreadable,
              which is the failure this whole pass exists to fix */}
          <rect x="0" y="362" width="400" height="38" fill={BG} />
          <text x="200" y="384" textAnchor="middle" fontFamily={MONO} fontSize="14" fill={INK}>
            {caption.length > 44 ? caption.slice(0, 43) + '…' : caption}
          </text>
        </>
      )}
    </svg>
  );
}
