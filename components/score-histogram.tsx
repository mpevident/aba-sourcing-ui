"use client";

interface ScoreHistogramProps {
  scores: number[];
  buckets?: number;
}

export function ScoreHistogram({ scores, buckets = 10 }: ScoreHistogramProps) {
  const bucketWidth = 100 / buckets;
  const counts = new Array(buckets).fill(0);
  for (const s of scores) {
    const b = Math.min(buckets - 1, Math.floor((s || 0) / bucketWidth));
    counts[b]++;
  }
  const max = Math.max(1, ...counts);
  const w = 320, h = 90, pad = 18;
  const innerW = w - pad * 2;
  const innerH = h - pad * 2;
  const barW = innerW / buckets - 1;

  const colorFor = (i: number) => {
    const range = i * bucketWidth;
    if (range >= 70) return "var(--positive)";
    if (range >= 40) return "var(--warning)";
    return "var(--critical)";
  };

  return (
    <div className="p-4 flex flex-col gap-3" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
      <div className="flex items-center justify-between">
        <span className="mono text-[10px] tracking-[0.18em]" style={{ color: "var(--text-3)" }}>
          SCORE DISTRIBUTION · {scores.length} SIGNALS
        </span>
        <span className="mono text-[10px]" style={{ color: "var(--text-3)" }}>
          0 → 100
        </span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" preserveAspectRatio="xMidYMid meet">
        {/* gridlines */}
        {[0, 0.25, 0.5, 0.75, 1].map((p) => (
          <line
            key={p}
            x1={pad}
            x2={w - pad}
            y1={pad + innerH * (1 - p)}
            y2={pad + innerH * (1 - p)}
            stroke="var(--border-subtle)"
            strokeWidth={0.5}
            strokeDasharray={p === 0 ? "" : "1 2"}
          />
        ))}
        {/* threshold line at 70 */}
        <line
          x1={pad + (70 / 100) * innerW}
          x2={pad + (70 / 100) * innerW}
          y1={pad}
          y2={pad + innerH}
          stroke="var(--positive)"
          strokeWidth={0.6}
          strokeDasharray="2 2"
          opacity={0.6}
        />
        {counts.map((c, i) => {
          const x = pad + i * (innerW / buckets) + 0.5;
          const barH = (c / max) * innerH;
          const y = pad + innerH - barH;
          return (
            <rect
              key={i}
              x={x}
              y={y}
              width={barW}
              height={barH}
              fill={colorFor(i)}
              opacity={0.85}
            />
          );
        })}
        {/* axis labels */}
        {[0, 25, 50, 75, 100].map((v) => (
          <text
            key={v}
            x={pad + (v / 100) * innerW}
            y={h - 3}
            textAnchor="middle"
            fontFamily="JetBrains Mono"
            fontSize="7"
            fill="var(--text-3)"
          >
            {v}
          </text>
        ))}
      </svg>
    </div>
  );
}
