import type { ReactNode } from "react";

interface PageHeaderProps {
  /** Small all-caps eyebrow, e.g. "ABA-INTEL · OPS:01". Accepts a ReactNode
   *  so back-links can be rendered here. Optional. */
  eyebrow?: ReactNode;
  title: string;
  /** Plain string subtitle, OR a ReactNode for richer content. */
  subtitle?: ReactNode;
  /** Live-updating accessory rendered next to the title (e.g. a RealtimeWatcher badge). */
  liveBadge?: ReactNode;
  /** Right-rail cluster — KPI minis, action buttons. */
  rail?: ReactNode;
}

/**
 * Consistent page header used across the dashboard so every route has the
 * same eyebrow / title / subtitle / right-rail layout.
 */
export function PageHeader({ eyebrow, title, subtitle, liveBadge, rail }: PageHeaderProps) {
  return (
    <div
      className="px-6 py-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between md:gap-6 pl-12 md:pl-6"
      style={{ borderBottom: "1px solid var(--border)" }}
    >
      <div className="flex flex-col gap-1 min-w-0">
        {eyebrow && (
          <span className="mono text-[10px] tracking-[0.2em]" style={{ color: "var(--text-3)" }}>
            {eyebrow}
          </span>
        )}
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-[22px] font-semibold tracking-tight truncate" style={{ color: "var(--text-1)" }}>
            {title}
          </h1>
          {liveBadge}
        </div>
        {subtitle && (
          <span className="mono text-[10.5px]" style={{ color: "var(--text-2)" }}>
            {subtitle}
          </span>
        )}
      </div>
      {rail && (
        <div className="flex items-center gap-4 md:gap-6 mono text-[10px] tracking-[0.15em] flex-wrap">
          {rail}
        </div>
      )}
    </div>
  );
}

interface RailStatProps {
  label: string;
  value: ReactNode;
  tone?: "data" | "positive" | "warning" | "critical" | "default";
}

export function RailStat({ label, value, tone = "default" }: RailStatProps) {
  const color =
    tone === "data" ? "var(--data)"
    : tone === "positive" ? "var(--positive)"
    : tone === "warning" ? "var(--warning)"
    : tone === "critical" ? "var(--critical)"
    : "var(--text-1)";
  return (
    <div className="flex flex-col items-end gap-0.5">
      <span style={{ color: "var(--text-3)" }}>{label}</span>
      <span className="tnum" style={{ color }}>{value}</span>
    </div>
  );
}
