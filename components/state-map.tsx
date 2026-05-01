"use client";

// US tile-grid map. Each state is a square. Color intensity by deal count.
// Midwest target states (CST priority) get a brighter base treatment.

const TILES: { code: string; row: number; col: number }[] = [
  { code: "ME", row: 0, col: 10 },
  { code: "VT", row: 1, col: 9 },  { code: "NH", row: 1, col: 10 },
  { code: "WA", row: 2, col: 1 }, { code: "ID", row: 2, col: 2 }, { code: "MT", row: 2, col: 3 },
  { code: "ND", row: 2, col: 4 }, { code: "MN", row: 2, col: 5 }, { code: "WI", row: 2, col: 6 },
  { code: "MI", row: 2, col: 7 }, { code: "NY", row: 2, col: 9 }, { code: "MA", row: 2, col: 10 },
  { code: "OR", row: 3, col: 1 }, { code: "NV", row: 3, col: 2 }, { code: "WY", row: 3, col: 3 },
  { code: "SD", row: 3, col: 4 }, { code: "IA", row: 3, col: 5 }, { code: "IL", row: 3, col: 6 },
  { code: "IN", row: 3, col: 7 }, { code: "OH", row: 3, col: 8 }, { code: "PA", row: 3, col: 9 },
  { code: "NJ", row: 3, col: 10 }, { code: "CT", row: 3, col: 11 }, { code: "RI", row: 3, col: 12 },
  { code: "CA", row: 4, col: 1 }, { code: "UT", row: 4, col: 2 }, { code: "CO", row: 4, col: 3 },
  { code: "NE", row: 4, col: 4 }, { code: "MO", row: 4, col: 5 }, { code: "KY", row: 4, col: 6 },
  { code: "WV", row: 4, col: 7 }, { code: "VA", row: 4, col: 8 }, { code: "MD", row: 4, col: 9 },
  { code: "DE", row: 4, col: 10 },
  { code: "AZ", row: 5, col: 2 }, { code: "NM", row: 5, col: 3 }, { code: "KS", row: 5, col: 4 },
  { code: "AR", row: 5, col: 5 }, { code: "TN", row: 5, col: 6 }, { code: "NC", row: 5, col: 7 },
  { code: "SC", row: 5, col: 8 }, { code: "DC", row: 5, col: 9 },
  { code: "OK", row: 6, col: 4 }, { code: "LA", row: 6, col: 5 }, { code: "MS", row: 6, col: 6 },
  { code: "AL", row: 6, col: 7 }, { code: "GA", row: 6, col: 8 },
  { code: "AK", row: 6, col: 0 }, { code: "HI", row: 7, col: 1 },
  { code: "TX", row: 7, col: 4 }, { code: "FL", row: 7, col: 9 },
];

const MIDWEST = new Set(["IL","OH","MI","IN","WI","MN","IA","MO","KS","NE","KY","ND","SD"]);

interface StateMapProps {
  counts: Record<string, number>;
  title?: string;
}

export function StateMap({ counts, title = "DEAL DENSITY · GEOGRAPHIC" }: StateMapProps) {
  const max = Math.max(1, ...Object.values(counts));
  const cell = 30;
  const gap = 3;
  const totalCols = 13;
  const totalRows = 8;
  const w = totalCols * (cell + gap);
  const h = totalRows * (cell + gap);

  const colorFor = (code: string) => {
    const c = counts[code] || 0;
    const inTarget = MIDWEST.has(code);
    if (c === 0) {
      return inTarget
        ? { fill: "rgba(77,217,230,0.04)", stroke: "rgba(77,217,230,0.18)", text: "var(--text-3)" }
        : { fill: "var(--bg-card)", stroke: "var(--border)", text: "var(--text-4)" };
    }
    const intensity = c / max; // 0..1
    const alpha = 0.15 + intensity * 0.6;
    return inTarget
      ? { fill: `rgba(77,217,230,${alpha})`, stroke: "rgba(77,217,230,0.55)", text: "var(--text-1)" }
      : { fill: `rgba(155,165,184,${alpha * 0.7})`, stroke: "var(--border-bright)", text: "var(--text-1)" };
  };

  return (
    <div
      className="p-4 flex flex-col gap-3"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
    >
      <div className="flex items-center justify-between">
        <span className="mono text-[10px] tracking-[0.18em]" style={{ color: "var(--text-3)" }}>
          {title}
        </span>
        <div className="flex items-center gap-3 mono text-[9px] tracking-[0.15em]" style={{ color: "var(--text-3)" }}>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2" style={{ background: "rgba(77,217,230,0.55)" }} />
            TARGET
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2" style={{ background: "rgba(155,165,184,0.4)" }} />
            OTHER
          </span>
        </div>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" preserveAspectRatio="xMidYMid meet">
        {TILES.map(({ code, row, col }) => {
          const x = col * (cell + gap);
          const y = row * (cell + gap);
          const c = colorFor(code);
          const count = counts[code] || 0;
          return (
            <g key={code}>
              <rect x={x} y={y} width={cell} height={cell} fill={c.fill} stroke={c.stroke} strokeWidth={0.75} />
              <text
                x={x + cell / 2}
                y={y + cell / 2 - 2}
                textAnchor="middle"
                fontFamily="JetBrains Mono"
                fontSize="8"
                fontWeight="600"
                letterSpacing="0.5"
                fill={c.text}
              >
                {code}
              </text>
              {count > 0 && (
                <text
                  x={x + cell / 2}
                  y={y + cell / 2 + 8}
                  textAnchor="middle"
                  fontFamily="JetBrains Mono"
                  fontSize="7.5"
                  fill={c.text}
                >
                  {count}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
