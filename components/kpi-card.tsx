import { Sparkline } from "./sparkline";
import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";

interface KpiCardProps {
  label: string;
  value: string | number;
  sub?: string;
  delta?: number;       // percentage change, e.g. 12.4
  trend?: number[];     // sparkline data
  accent?: "data" | "action" | "positive" | "warning" | "critical" | "signal";
}

// Subtle accent-tinted background per KPI accent. The tints are very low alpha
// so they don't overpower the dark base — they just give each KPI its own
// identity instead of looking like uniform gray cards.
const ACCENT_BG: Record<NonNullable<KpiCardProps["accent"]>, string> = {
  data:     "linear-gradient(135deg, rgba(77,217,230,0.06) 0%, var(--bg-card) 70%)",
  signal:   "linear-gradient(135deg, rgba(183,148,246,0.06) 0%, var(--bg-card) 70%)",
  positive: "linear-gradient(135deg, rgba(74,222,128,0.06) 0%, var(--bg-card) 70%)",
  warning:  "linear-gradient(135deg, rgba(255,168,56,0.06) 0%, var(--bg-card) 70%)",
  critical: "linear-gradient(135deg, rgba(255,87,87,0.06) 0%, var(--bg-card) 70%)",
  action:   "linear-gradient(135deg, rgba(255,168,56,0.06) 0%, var(--bg-card) 70%)",
};

export function KpiCard({ label, value, sub, delta, trend, accent = "data" }: KpiCardProps) {
  const accentColor = `var(--${accent})`;
  const Arrow = delta == null ? Minus : delta > 0 ? ArrowUpRight : delta < 0 ? ArrowDownRight : Minus;
  const deltaColor = delta == null ? "var(--text-3)" : delta > 0 ? "var(--positive)" : delta < 0 ? "var(--critical)" : "var(--text-3)";

  return (
    <div
      className="relative px-4 py-3.5 flex flex-col gap-2 min-h-[120px] overflow-hidden"
      style={{
        background: ACCENT_BG[accent],
        border: "1px solid var(--border)",
      }}
    >
      {/* top accent bar */}
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-px"
        style={{ background: `linear-gradient(90deg, ${accentColor}, transparent 60%)`, opacity: 0.6 }}
      />

      <div className="flex items-center justify-between">
        <span className="mono text-[9px] tracking-[0.18em]" style={{ color: "var(--text-3)" }}>
          {label.toUpperCase()}
        </span>
        {delta != null && (
          <span className="flex items-center gap-0.5 mono text-[10px] tnum" style={{ color: deltaColor }}>
            <Arrow size={10} strokeWidth={2} />
            {delta > 0 ? "+" : ""}
            {delta.toFixed(1)}%
          </span>
        )}
      </div>

      <div className="flex items-end justify-between gap-3">
        <div className="flex flex-col">
          <span
            className="mono text-[28px] font-semibold tnum leading-none"
            style={{ color: "var(--text-1)" }}
          >
            {value}
          </span>
          {sub && (
            <span className="mono text-[10px] mt-1.5" style={{ color: "var(--text-3)" }}>
              {sub}
            </span>
          )}
        </div>
        {trend && trend.length > 1 && (
          <Sparkline data={trend} color={accentColor} width={70} height={28} />
        )}
      </div>
    </div>
  );
}
