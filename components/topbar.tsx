import { LiveTimestamp } from "@/components/live-timestamp";
import { PracticeSearch } from "@/components/practice-search";
import { getScraperRows, summarize } from "@/lib/scrapers";

export async function TopBar() {
  const rows = await getScraperRows();
  const { armed, total, tier } = summarize(rows);
  const armedColor =
    tier === "ok" ? "var(--positive)" : tier === "warn" ? "var(--warning)" : "var(--critical)";

  return (
    <div
      className="h-11 flex items-center justify-between gap-3 px-4 pl-14 md:pl-4 sticky top-0 z-20"
      style={{ background: "var(--bg-surface)", borderBottom: "1px solid var(--border)" }}
    >
      {/* Left cluster — hidden on small screens to make room for the search */}
      <div className="hidden lg:flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full status-live" style={{ background: "var(--positive)" }} />
          <span className="mono text-[10px] tracking-[0.15em]" style={{ color: "var(--text-2)" }}>
            CONN · LIVE
          </span>
        </div>
        <span style={{ color: "var(--text-4)" }}>·</span>
        <LiveTimestamp />
      </div>

      <div className="flex-1 lg:flex-initial min-w-0">
        <PracticeSearch />
      </div>

      <div className="hidden md:flex items-center gap-3 mono text-[10px] tracking-[0.15em] shrink-0">
        <div className="flex items-center gap-1.5">
          <span style={{ color: "var(--text-3)" }}>SCRAPERS</span>
          <span className="tnum" style={{ color: armedColor }}>{armed}/{total}</span>
        </div>
        <span className="hidden xl:inline" style={{ color: "var(--text-4)" }}>·</span>
        <div className="hidden xl:flex items-center gap-1.5">
          <span style={{ color: "var(--text-3)" }}>OPERATOR</span>
          <span style={{ color: "var(--text-1)" }}>M.PAVLOVSKYI</span>
        </div>
      </div>
    </div>
  );
}
