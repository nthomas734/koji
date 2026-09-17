'use client';

import { useMemo } from 'react';
import type { SunDay } from '@/lib/sun';

export interface TrackFrame {
  n:        number;
  hour:     number | null;
  done:     boolean;
  must:     boolean;
  missed:   boolean;
}

/**
 * The day's real sun altitude as an area chart, with the day's frames hung
 * below the axis at the times they'll be shot. The shape of the curve is the
 * information: a low flat arc means raking light all day, a tall dome means
 * a punishing middle.
 */
/** A soft backing plate so a label stays readable over gradient, band or curve. */
function Plate({ x, y, w, h, bg }: { x: number; y: number; w: number; h: number; bg: string }) {
  return <rect x={x} y={y} width={w} height={h} rx="3" fill={bg} opacity="0.88" />;
}

export function SunTrack({
  sun, frames, now, sunMode = false, onPick,
}: {
  sun:      SunDay;
  frames:   TrackFrame[];
  now:      number | null;
  sunMode?: boolean;
  onPick?:  (n: number) => void;
}) {
  const W = 280;
  const PT = 8;      // plot top
  const AX = 86;     // axis / plot bottom
  const CHIP_Y = AX + 11;
  const H = 118;

  const geom = useMemo(() => {
    const placed = frames.filter(f => f.hour != null) as Array<TrackFrame & { hour: number }>;

    // x window: the daylight part of the day, widened to hold every frame
    let h0 = (sun.sunrise ?? 6) - 1;
    let h1 = (sun.sunset ?? 19) + 1;
    for (const f of placed) { h0 = Math.min(h0, f.hour - 0.4); h1 = Math.max(h1, f.hour + 0.4); }
    h0 = Math.max(0, Math.floor(h0));
    h1 = Math.min(24, Math.ceil(h1));
    if (h1 - h0 < 6) h1 = Math.min(24, h0 + 6);

    const a0 = -9;
    const a1 = Math.max(sun.peak + 5, 14);

    const X = (h: number) => ((h - h0) / (h1 - h0)) * W;
    const Y = (a: number) => AX - ((a - a0) / (a1 - a0)) * (AX - PT);

    const seg = sun.series.filter(([h]) => h >= h0 && h <= h1);
    const line = seg.map(([h, a], i) => `${i ? 'L' : 'M'}${X(h).toFixed(1)} ${Y(a).toFixed(1)}`).join(' ');
    const area = seg.length
      ? `M${X(seg[0][0]).toFixed(1)} ${Y(a0).toFixed(1)} ` +
        seg.map(([h, a]) => `L${X(h).toFixed(1)} ${Y(a).toFixed(1)}`).join(' ') +
        ` L${X(seg[seg.length - 1][0]).toFixed(1)} ${Y(a0).toFixed(1)} Z`
      : '';

    // Label relaxation — chips are 17px wide, so any two frames closer than
    // 20px collide. Push colliding pairs apart equally until everything clears,
    // then re-centre. The chip moves; a tick and a slanted leader keep pointing
    // at the true time, which is the standard fix for a crowded axis.
    const MIN = 20, LO = 10, HI = W - 10;
    const sorted = [...placed].sort((a, b) => a.hour - b.hour);
    const cx = sorted.map(f => X(f.hour));
    for (let pass = 0; pass < 400; pass++) {
      let moved = false;
      for (let i = 0; i < cx.length - 1; i++) {
        const d = cx[i + 1] - cx[i];
        if (d < MIN) { const p = (MIN - d) / 2; cx[i] -= p; cx[i + 1] += p; moved = true; }
      }
      const lo = Math.min(...cx), hi = Math.max(...cx);
      if (cx.length && lo < LO) { for (let i = 0; i < cx.length; i++) cx[i] += LO - lo; moved = true; }
      if (cx.length && hi > HI) { for (let i = 0; i < cx.length; i++) cx[i] -= hi - HI; moved = true; }
      if (!moved) break;
    }

    // The four events, placed where the curve actually crosses each boundary.
    // A dot alone could not say which way the sun was going, so the two horizon
    // crossings are half-discs sitting on the line — rising above it, setting
    // below — which reads at 6px where a sun with rays turns to mush.
    const inWin = (h: number | null | undefined): h is number =>
      h != null && isFinite(h) && h >= h0 && h <= h1;
    const marks = {
      rise:   inWin(sun.sunrise)  ? X(sun.sunrise)  : null,
      golden: inWin(sun.goldenPm) ? X(sun.goldenPm) : null,
      set:    inWin(sun.sunset)   ? X(sun.sunset)   : null,
      blue:   inWin(sun.blueEnd)  ? X(sun.blueEnd)  : null,
    };

    return {
      line, area, X, Y, h0, h1, a0, marks,
      horizonY: Y(0), goldTopY: Y(6), blueBotY: Y(-6),
      noonX: X(sun.noon), noonY: Y(sun.peak),
      nowX: now != null && now >= h0 && now <= h1 ? X(now) : null,
      chips: sorted.map((f, i) => ({ f, tx: X(f.hour), cx: cx[i] })),
    };
  }, [sun, frames, now]);

  const ink  = sunMode ? '#100E0B' : '#1C1A16';
  const ink3 = sunMode ? '#46423A' : '#6B6760';
  const cop  = sunMode ? '#8F2F01' : '#B83C01';
  const face = sunMode ? '#FFFFFF' : '#FDFAF5';
  const edge = sunMode ? '#5C5850' : '#C8C2B6';
  const gid  = sunMode ? 'komaSkySun' : 'komaSky';
  const plate = sunMode ? '#FFFDF8' : '#FDFAF5';
  const sunFill = sunMode ? '#D98A14' : '#E8A33C';
  const sunEdge = sunMode ? '#6B3F00' : '#8A5200';
  const setFill = sunMode ? '#9C9384' : '#B4AE9F';
  const setEdge = sunMode ? '#2A2721' : '#4A453C';
  const blueDot = sunMode ? '#44547A' : '#5C6C8E';
  const R = sunMode ? 4.4 : 4;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`} width="100%" role="img"
      aria-label={`Sun altitude through the day, peaking at ${Math.round(sun.peak)} degrees, with ${geom.chips.length} planned frames`}
      style={{ display: 'block', margin: '0 -2px 2px' }}
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0"   stopColor="#9FB6D4" stopOpacity=".55" />
          <stop offset=".42" stopColor="#F2E7CF" stopOpacity=".75" />
          <stop offset=".72" stopColor="#FBB04F" stopOpacity=".85" />
          <stop offset="1"   stopColor="#CF6A21" stopOpacity=".92" />
        </linearGradient>
      </defs>

      {/* golden band 0–6°, blue band -6–0° */}
      <rect x="0" y={geom.goldTopY} width={W} height={Math.max(0, geom.horizonY - geom.goldTopY)} fill="#FBB04F" opacity=".22" />
      <rect x="0" y={geom.horizonY} width={W} height={Math.max(0, geom.blueBotY - geom.horizonY)} fill="#5C6C8E" opacity=".16" />

      <path d={geom.area} fill={`url(#${gid})`} />
      <path d={geom.line} fill="none" stroke={cop} strokeWidth={sunMode ? 2.2 : 1.8} strokeLinejoin="round" />

      <line x1="0" y1={geom.horizonY} x2={W} y2={geom.horizonY} stroke={ink} strokeWidth={sunMode ? 1.2 : 0.9} opacity=".55" />

      {/* Every label sits over the gradient, the bands or the curve, so each
          gets a backing plate in the page colour. The golden band is only 0–6°,
          so on a high-sun day (San Diego peaks at 60° against London's 28°) the
          two lines are a few pixels apart — under 18px of separation they
          collapse into one label for the band. */}
      {geom.horizonY - geom.goldTopY >= 18 ? (
        <>
          <Plate x={3} y={geom.goldTopY - 11} w={52} h={11} bg={plate} />
          <text x="6" y={geom.goldTopY - 2.5} fontFamily="var(--font-mono)" fontSize="8.5" fill={cop}>6° golden</text>
          <Plate x={3} y={geom.horizonY + 1.5} w={42} h={11} bg={plate} />
          <text x="6" y={geom.horizonY + 10} fontFamily="var(--font-mono)" fontSize="8.5" fill={ink3}>horizon</text>
        </>
      ) : (
        <>
          <Plate x={3} y={geom.goldTopY - 13} w={62} h={11.5} bg={plate} />
          <text x="6" y={geom.goldTopY - 4} fontFamily="var(--font-mono)" fontSize="8.5" fill={cop}>golden 0–6°</text>
        </>
      )}

      {/* sunrise — half a sun coming up out of the horizon, with three short
          rays. The rays are the only thing here that might not survive a very
          small render, so they are the only thing that carries no meaning. */}
      {geom.marks.rise != null && (
        <g>
          <g stroke={sunEdge} strokeWidth="1.1" strokeLinecap="round" opacity="0.85">
            <line x1={geom.marks.rise} y1={geom.horizonY - R - 1.5} x2={geom.marks.rise} y2={geom.horizonY - R - 3.1} />
            <line x1={geom.marks.rise - 3.7} y1={geom.horizonY - 3.7} x2={geom.marks.rise - 4.9} y2={geom.horizonY - 4.9} />
            <line x1={geom.marks.rise + 3.7} y1={geom.horizonY - 3.7} x2={geom.marks.rise + 4.9} y2={geom.horizonY - 4.9} />
          </g>
          <path d={`M${geom.marks.rise - R} ${geom.horizonY} A${R} ${R} 0 0 1 ${geom.marks.rise + R} ${geom.horizonY} Z`}
                fill={sunFill} stroke={sunEdge} strokeWidth="0.8" />
        </g>
      )}

      {/* golden — where the curve drops into the 0–6° band it is already drawing */}
      {geom.marks.golden != null && (
        <circle cx={geom.marks.golden} cy={geom.goldTopY} r={sunMode ? 3.1 : 2.8} fill={cop} />
      )}

      {/* sunset — the same sun, gone under the line */}
      {geom.marks.set != null && (
        <path d={`M${geom.marks.set - R} ${geom.horizonY} A${R} ${R} 0 0 0 ${geom.marks.set + R} ${geom.horizonY} Z`}
              fill={setFill} stroke={setEdge} strokeWidth="0.8" />
      )}

      {/* blue — the bottom of the −6–0° band, after which it is simply dark */}
      {geom.marks.blue != null && (
        <circle cx={geom.marks.blue} cy={geom.blueBotY} r={sunMode ? 3.1 : 2.8} fill={blueDot} />
      )}

      <circle cx={geom.noonX} cy={geom.noonY} r={sunMode ? 3.4 : 3} fill={cop} />
      <Plate x={geom.noonX + 5} y={geom.noonY - 5.5} w={sunMode ? 46 : 43} h={11.5} bg={plate} />
      <text x={geom.noonX + 8} y={geom.noonY + 3.4} fontFamily="var(--font-mono)" fontSize={sunMode ? 10 : 9.5} fill={ink} fontWeight="500">
        {Math.round(sun.peak)}° max
      </text>

      {geom.nowX != null && (
        <>
          <line x1={geom.nowX} y1="0" x2={geom.nowX} y2={AX} stroke={ink} strokeWidth="2" />
          <Plate x={geom.nowX + 2.5} y={1} w={20} h={11} bg={plate} />
          <text x={geom.nowX + 5} y="9.5" fontFamily="var(--font-mono)" fontSize="8.5" fill={ink}>now</text>
        </>
      )}

      <line x1="0" y1={AX} x2={W} y2={AX} stroke={ink3} strokeWidth=".8" opacity=".5" />

      {geom.chips.map(({ f, tx, cx }) => {
        const stroke = f.done || f.must ? cop : edge;
        const fill   = f.done ? cop : f.must ? '#FBE7D4' : face;
        const tcol   = f.done ? '#FBE7D4' : f.must ? cop : ink3;
        return (
          <g key={f.n} onClick={onPick ? () => onPick(f.n) : undefined}
             style={onPick ? { cursor: 'pointer' } : undefined}>
            <line x1={tx} y1={AX - 3} x2={tx} y2={AX + 2} stroke={stroke} strokeWidth="1.4" />
            <path d={`M${tx.toFixed(1)} ${AX + 2} L${cx.toFixed(1)} ${CHIP_Y}`} stroke={stroke} strokeWidth="1" fill="none" opacity=".5" />
            <rect x={cx - 8.5} y={CHIP_Y} width="17" height="17" rx="5"
                  fill={fill} stroke={stroke} strokeWidth={f.must ? 2.2 : sunMode ? 1.4 : 1.1}
                  opacity={f.missed ? 0.45 : 1} />
            <text x={cx} y={CHIP_Y + 12} textAnchor="middle" fontFamily="var(--font-mono)"
                  fontSize="9.5" fill={tcol} opacity={f.missed ? 0.55 : 1}>{f.n}</text>
          </g>
        );
      })}
    </svg>
  );
}
