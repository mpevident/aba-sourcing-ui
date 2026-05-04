import { Search, Command } from "lucide-react";
import { LiveTimestamp } from "@/components/live-timestamp";
import { getScraperRows, summarize } from "@/lib/scrapers";

export async function TopBar() {
  const rows = await getScraperRows();
  const { armed, total, tier } = summarize(rows);
  const armedColor =
    tier === "ok" ? "var(--positive)" : tier === "warn" ? "var(--warning)" : "var(--critical)";

  return (
    <div
      className="h-11 flex items-center justify-between px-4 sticky top-0 z-20"
      style={{ background: "var(--bg-surface)", borderBottom: "1px solid var(--border)" }}
    >
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full status-live" style={{ background: "var(--positive)" }} />
          <span className="mono text-[10px] tracking-[0.15em]" style={{ color: "var(--text-2)" }}>
            CONN · LIVE
          </span>
        </div>
        <span style={{ color: "var(--text-4)" }}>·</span>
        <LiveTimestamp />
      </div>

      <div
        className="flex items-center gap-2 px-3 py-1.5 min-w-[360px]"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
      >
        <Search size={12} style={{ color: "var(--text-3)" }} />
        <input
          placeholder="Query intel — practices, owners, signals…"
          className="flex-1 bg-transparent text-[12px] outline-none mono"
          style={{ color: "var(--text-1)" }}
        />
        <span
          className="flex items-center gap-1 mono text-[9px] tracking-[0.1em] px-1.5 py-0.5"
          style={{ color: "var(--text-3)", border: "1px solid var(--border)" }}
        >
          <Command size={10} /> K
        </span>
      </div>

      <div className="flex items-center gap-3 mono text-[10px] tracking-[0.15em]">
        <div className="flex items-center gap-1.5">
          <span style={{ color: "var(--text-3)" }}>SCRAPERS ARMED</span>
          <span className="tnum" style={{ color: armedColor }}>{armed}/{total}</span>
        </div>
        <span style={{ color: "var(--text-4)" }}>·</span>
        <div className="flex items-center gap-1.5">
          <span style={{ color: "var(--text-3)" }}>OPERATOR</span>
          <span style={{ color: "var(--text-1)" }}>M.PAVLOVSKYI</span>
        </div>
      </div>
    </div>
  );
}
