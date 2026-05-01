export function ScoreBadge({ score }: { score: number | null }) {
  if (score === null || score === undefined) {
    return <span className="text-slate-500 font-mono text-sm">—</span>;
  }
  const color = score >= 70 ? "#22C55E" : score >= 40 ? "#F59E0B" : "#EF4444";
  const bg = score >= 70 ? "rgba(34,197,94,0.1)" : score >= 40 ? "rgba(245,158,11,0.1)" : "rgba(239,68,68,0.1)";
  return (
    <span
      className="inline-flex items-center justify-center w-10 h-7 rounded font-mono text-sm font-semibold"
      style={{ color, background: bg }}
    >
      {Math.round(score)}
    </span>
  );
}
