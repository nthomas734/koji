// Brass-line logo. Used everywhere koji's wordmark appears.
// Matches the home-screen icon at /public/icon.svg.
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
        {/* Horizon road, gently curving */}
        <path d="M 8 76 Q 30 73, 50 74 T 92 76" strokeWidth="1.4" opacity="0.65" />
        {/* Cross-grid line, dashed */}
        <path d="M 50 86 L 50 96" strokeWidth="1" strokeDasharray="2 2" opacity="0.45" />
        {/* Bloom halos under pin */}
        <ellipse cx="50" cy="74" rx="14" ry="2.3" strokeWidth="1.1" opacity="0.55" />
        <ellipse cx="50" cy="74" rx="8" ry="1.4" strokeWidth="1.1" opacity="0.85" />
        {/* Grain-pin */}
        <path
          d="M 50 22 C 56 32, 56 56, 50 70 C 44 56, 44 32, 50 22 Z"
          strokeWidth="1.8"
        />
        {/* Interior crease */}
        <path d="M 50 30 L 50 60" strokeWidth="1" opacity="0.45" />
        {/* Pin dot */}
        <circle cx="50" cy="74" r="1.5" fill={color} stroke="none" />
      </g>
    </svg>
  );
}
