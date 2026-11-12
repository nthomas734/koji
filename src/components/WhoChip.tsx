// Whose stop this is, on a day the two of you split up. Quiet and outlined so
// it reads as a label, not another tag.
export function WhoChip({ who, color }: { who?: string | null; color?: string }) {
  if (!who) return null;
  return (
    <span style={{
      display: 'inline-block', fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600,
      letterSpacing: '0.04em', textTransform: 'none', padding: '1px 8px', borderRadius: 999, lineHeight: '18px',
      border: `1px solid ${color ?? 'var(--border)'}`, color: color ?? 'var(--ink-2)',
    }}>
      {who}
    </span>
  );
}
