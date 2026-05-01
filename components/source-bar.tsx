"use client";

const SOURCE_COLORS: Record<string, string> = {
  bizbuysell: "#4DD9E6",
  bizquest: "#B794F6",
  dealstream: "#7AE0BC",
  businessesforsale: "#FFA838",
  bizben: "#FF6B9D",
};

export function SourceBar({ counts }: { counts: Record<string, number> }) {
  const entries = Object.entries(counts).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((s, [, v]) => s + v, 0) || 1;

  return (
    <div className="p-4 flex flex-col gap-3" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
      <div className="flex items-center justify-between">
        <span className="mono text-[10px] tracking-[0.18em]" style={{ color: "var(--text-3)" }}>
          SOURCE BREAKDOWN
        </span>
        <span className="mono text-[10px] tnum" style={{ color: "var(--text-2)" }}>
          {total}
        </span>
      </div>

      <div className="flex h-2 w-full overflow-hidden" style={{ background: "var(--bg-base)" }}>
        {entries.map(([k, v]) => (
          <div
            key={k}
            style={{
              width: `${(v / total) * 100}%`,
              background: SOURCE_COLORS[k] || "var(--neutral)",
            }}
          />
        ))}
      </div>

      <div className="flex flex-col gap-1.5 mt-1">
        {entries.map(([k, v]) => {
          const pct = ((v / total) * 100).toFixed(1);
          return (
            <div key={k} className="flex items-center justify-between text-[11px] mono">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2" style={{ background: SOURCE_COLORS[k] || "var(--neutral)" }} />
                <span style={{ color: "var(--text-2)" }}>{k}</span>
              </div>
              <span className="tnum flex items-center gap-3">
                <span style={{ color: "var(--text-3)" }}>{pct}%</span>
                <span style={{ color: "var(--text-1)", minWidth: 32, textAlign: "right" }}>{v}</span>
              </span>
            </div>
          );
        })}
        {entries.length === 0 && (
          <span className="mono text-[10px]" style={{ color: "var(--text-3)" }}>
            NO DATA YET — TRIGGER SCRAPE
          </span>
        )}
      </div>
    </div>
  );
}
