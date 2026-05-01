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

export function KpiCard({ label, value, sub, delta, trend, accent = "data" }: KpiCardProps) {
  const accentColor = `var(--${accent})`;
  const Arrow = delta == null ? Minus : delta > 0 ? ArrowUpRight : delta < 0 ? ArrowDownRight : Minus;
  const deltaColor = delta == null ? "var(--text-3)" : delta > 0 ? "var(--positive)" : delta < 0 ? "var(--critical)" : "var(--text-3)";

  return (
    <div
      className="px-4 py-3.5 flex flex-col gap-2 min-h-[110px]"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
    >
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
          <span className="mono text-[26px] font-semibold tnum leading-none" style={{ color: "var(--text-1)" }}>
            {value}
          </span>
          {sub && (
            <span className="mono text-[10px] mt-1" style={{ color: "var(--text-3)" }}>
              {sub}
            </span>
          )}
        </div>
        {trend && trend.length > 1 && <Sparkline data={trend} color={accentColor} width={70} height={28} />}
      </div>
    </div>
  );
}
