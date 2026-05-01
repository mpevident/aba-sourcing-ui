import { createClient } from "@/lib/supabase/server";
export const dynamic = 'force-dynamic';
import { KpiCard } from "@/components/kpi-card";
import { ScoreBadge } from "@/components/score-badge";

function fmt(n: number | null) {
  if (!n) return "—";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

const SOURCE_COLORS: Record<string, string> = {
  bizbuysell: "#3B82F6",
  bizquest: "#8B5CF6",
  dealstream: "#06B6D4",
  businessesforsale: "#F59E0B",
  bizben: "#EC4899",
};

export default async function IntelligenceFeed() {
  const supabase = await createClient();

  const [
    { data: listings },
    { count: totalCount },
    { count: highFitCount },
    { count: newTodayCount },
    { count: pursuingCount },
  ] = await Promise.all([
    supabase
      .from("broker_signals")
      .select("*")
      .order("score", { ascending: false })
      .limit(50),
    supabase.from("broker_signals").select("*", { count: "exact", head: true }),
    supabase.from("broker_signals").select("*", { count: "exact", head: true }).gte("score", 70),
    supabase
      .from("broker_signals")
      .select("*", { count: "exact", head: true })
      .gte("first_seen_at", new Date(Date.now() - 86_400_000).toISOString()),
    supabase
      .from("broker_signals")
      .select("*", { count: "exact", head: true })
      .eq("status", "pursuing"),
  ]);

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-white text-2xl font-semibold">Intelligence Feed</h1>
        <p className="text-slate-400 text-sm mt-1">Live deal flow from 5 broker marketplaces, scored by AI</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <KpiCard label="New Today" value={newTodayCount ?? 0} />
        <KpiCard label="High Fit (70+)" value={highFitCount ?? 0} sub="CST target range" />
        <KpiCard label="Pursuing" value={pursuingCount ?? 0} />
        <KpiCard label="Total Universe" value={(totalCount ?? 0).toLocaleString()} />
      </div>

      {/* Table */}
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: "#2A3347" }}>
        <div className="px-5 py-4 border-b flex items-center justify-between" style={{ background: "#161B27", borderColor: "#2A3347" }}>
          <h2 className="text-white font-medium text-sm">Top Listings</h2>
          <span className="text-slate-500 text-xs">{listings?.length ?? 0} shown</span>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b" style={{ background: "#161B27", borderColor: "#2A3347" }}>
              {["Score", "Listing", "Location", "Revenue", "Asking", "Source", "Status"].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {listings?.map((l: any, i: number) => (
              <tr
                key={l.id}
                className="border-b transition-colors hover:bg-white/[0.02] cursor-pointer"
                style={{ borderColor: "#2A3347", background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)" }}
              >
                <td className="px-4 py-3"><ScoreBadge score={l.score} /></td>
                <td className="px-4 py-3 max-w-xs">
                  <a href={l.listing_url} target="_blank" rel="noopener noreferrer" className="text-white text-sm font-medium hover:text-blue-400 transition-colors line-clamp-1">
                    {l.listing_title || "Untitled"}
                  </a>
                  {l.score_notes && (
                    <p className="text-slate-500 text-xs mt-0.5 line-clamp-1">{l.score_notes}</p>
                  )}
                </td>
                <td className="px-4 py-3">
                  {l.location_state && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-semibold text-blue-300 bg-blue-500/10">
                      {l.location_state}
                    </span>
                  )}
                  {l.location_city && (
                    <span className="ml-1.5 text-slate-400 text-xs">{l.location_city}</span>
                  )}
                </td>
                <td className="px-4 py-3 font-mono text-sm text-slate-300">{fmt(l.revenue_claimed)}</td>
                <td className="px-4 py-3 font-mono text-sm text-slate-300">{fmt(l.asking_price)}</td>
                <td className="px-4 py-3">
                  <span
                    className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize"
                    style={{
                      color: SOURCE_COLORS[l.source_site] || "#94A3B8",
                      background: (SOURCE_COLORS[l.source_site] || "#94A3B8") + "18",
                    }}
                  >
                    {l.source_site}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${
                    l.status === "pursuing" ? "text-green-400 bg-green-500/10" :
                    l.status === "reviewing" ? "text-yellow-400 bg-yellow-500/10" :
                    l.status === "passed" ? "text-slate-500 bg-slate-500/10" :
                    "text-slate-400 bg-slate-500/10"
                  }`}>
                    {l.status || "new"}
                  </span>
                </td>
              </tr>
            ))}
            {(!listings || listings.length === 0) && (
              <tr>
                <td colSpan={7} className="px-4 py-16 text-center text-slate-500 text-sm">
                  No listings yet — scraper runs daily at 6am CT
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
