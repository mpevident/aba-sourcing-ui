export function ScoreBadge({ score }: { score: number | null }) {
  if (score === null || score === undefined) {
    return <span className="mono text-xs" style={{ color: "var(--text-4)" }}>—</span>;
  }
  const tier = score >= 70 ? "high" : score >= 40 ? "med" : "low";
  const map = {
    high: { c: "var(--positive)", bg: "rgba(74,222,128,0.08)", b: "rgba(74,222,128,0.25)" },
    med:  { c: "var(--warning)",  bg: "rgba(255,168,56,0.08)", b: "rgba(255,168,56,0.25)" },
    low:  { c: "var(--critical)", bg: "rgba(255,87,87,0.06)",  b: "rgba(255,87,87,0.2)" },
  } as const;
  const s = map[tier];
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
