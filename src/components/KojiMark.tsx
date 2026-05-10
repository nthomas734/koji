// Brass-line logo. Matches the home-screen icon at /public/icon.svg.
// For dark surfaces pass color="#C8A97E"; default is var(--brass) for parchment.

export function KojiMark({
  size = 32,
  color = 'var(--brass)',
}: {
  size?: number;
  color?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="koji"
    >
      <g stroke={color} fill="none" strokeLinecap="round" strokeLinejoin="round">
        {/* Horizon road */}
        <path d="M 22 70 Q 36 68, 50 69 T 78 70" strokeWidth="2.2" opacity="0.7" />
        {/* Bloom halo */}
        <ellipse cx="50" cy="68" rx="12" ry="2" strokeWidth="2.2" opacity="0.7" />
        {/* Grain-pin */}
        <path
          d="M 50 28 C 58 38, 58 60, 50 66 C 42 60, 42 38, 50 28 Z"
          strokeWidth="2.6"
        />
        {/* Pin dot */}
        <circle cx="50" cy="68" r="1.8" fill={color} stroke="none" />
      </g>
    </svg>
  );
}
