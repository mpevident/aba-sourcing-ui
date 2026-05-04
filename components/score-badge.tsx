interface ScoreBadgeProps {
  score: number | null | undefined;
  /** "default" (shipped) or "compact" (no fill bar) */
  variant?: "default" | "compact";
}

const TIERS = {
  high: { c: "var(--positive)", bg: "rgba(74,222,128,0.10)", b: "rgba(74,222,128,0.30)", fill: "rgba(74,222,128,0.20)" },
  med:  { c: "var(--warning)",  bg: "rgba(255,168,56,0.08)", b: "rgba(255,168,56,0.28)", fill: "rgba(255,168,56,0.18)" },
  low:  { c: "var(--critical)", bg: "rgba(255,87,87,0.06)",  b: "rgba(255,87,87,0.22)",  fill: "rgba(255,87,87,0.14)" },
} as const;

export function ScoreBadge({ score, variant = "default" }: ScoreBadgeProps) {
  if (score === null || score === undefined) {
    return <span className="mono text-xs" style={{ color: "var(--text-4)" }}>—</span>;
  }
  const tier: keyof typeof TIERS = score >= 70 ? "high" : score >= 40 ? "med" : "low";
  const s = TIERS[tier];
  const clamped = Math.max(0, Math.min(100, score));

  if (variant === "compact") {
    return (
      <span
        className="inline-flex items-center justify-center mono text-[11px] font-semibold tnum"
        style={{
          color: s.c,
          background: s.bg,
          border: `1px solid ${s.b}`,
          minWidth: 38,
          padding: "2px 6px",
          borderRadius: 1,
        }}
      >
        {Math.round(score)}
      </span>
    );
  }

  // Default variant: subtle fill bar behind the number, scaled to score / 100.
  return (
    <span
      className="relative inline-flex items-center justify-center overflow-hidden mono text-[11px] font-semibold tnum"
      style={{
        color: s.c,
        background: s.bg,
        border: `1px solid ${s.b}`,
        minWidth: 42,
        padding: "2px 6px",
        borderRadius: 1,
      }}
    >
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 pointer-events-none"
        style={{
          width: `${clamped}%`,
          background: s.fill,
        }}
      />
      <span className="relative z-10">{Math.round(score)}</span>
    </span>
  );
}
