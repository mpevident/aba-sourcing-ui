import { getScraperRows, FRESH_HOURS, STALE_HOURS } from "@/lib/scrapers";

export async function ScraperHealth() {
  const rows = await getScraperRows();

  return (
    <div
      className="p-4 flex flex-col gap-3"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
    >
      <div className="flex items-center justify-between">
        <span className="mono text-[10px] tracking-[0.18em]" style={{ color: "var(--text-3)" }}>
          SCRAPER HEALTH · BROKER LISTINGS
        </span>
        <span className="mono text-[9px] tracking-[0.15em]" style={{ color: "var(--text-3)" }}>
          {`<${FRESH_HOURS}h ARMED · <${STALE_HOURS / 24}d STALE`}
        </span>
      </div>
      <div className="flex flex-col gap-2.5 mono text-[11px]">
        {rows.map((r) => {
          const c =
            r.tier === "ok" ? "var(--positive)" :
            r.tier === "warn" ? "var(--warning)" : "var(--critical)";
          return (
            <div
              key={r.key}
              className="flex items-center justify-between gap-3"
              style={{ borderBottom: "1px solid var(--border-subtle)", paddingBottom: 8 }}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: c }} />
                <div className="flex flex-col min-w-0">
                  <span className="tracking-[0.12em] truncate" style={{ color: "var(--text-2)" }}>
                    {r.key.toUpperCase()}
                  </span>
                  <span className="text-[9.5px]" style={{ color: "var(--text-3)" }}>{r.reason}</span>
                </div>
              </div>
              <span className="text-[10px] tracking-[0.15em]" style={{ color: c }}>{r.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
