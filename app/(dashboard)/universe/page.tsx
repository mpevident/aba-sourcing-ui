"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ScoreBadge } from "@/components/score-badge";
import { RealtimeWatcher } from "@/components/realtime-watcher";
import { PageHeader, RailStat } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Search, ExternalLink, Database } from "lucide-react";

const MIDWEST = ["IL","OH","MI","IN","WI","MN","IA","MO","KS","NE","KY","ND","SD"];

const STATUS_COLOR: Record<string, string> = {
  pursuing: "var(--data)",
  reviewing: "var(--warning)",
  passed: "var(--critical)",
  closed: "var(--positive)",
};

function fmt(n: number | null) {
  if (n == null) return "—";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

export default function Universe() {
  const [listings, setListings] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState("all");
  const [scoreMin, setScoreMin] = useState(0);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase.from("broker_signals").select("*").order("score", { ascending: false }).limit(200);
    if (stateFilter !== "all") q = q.eq("location_state", stateFilter);
    if (scoreMin > 0) q = q.gte("score", scoreMin);
    const { data } = await q;
    setListings(data || []);
    setLoading(false);
  }, [stateFilter, scoreMin, supabase]);

  useEffect(() => {
    load();
  }, [load]);


  const filtered = listings.filter(l =>
    !search || (l.listing_title || "").toLowerCase().includes(search.toLowerCase()) ||
    (l.location_city || "").toLowerCase().includes(search.toLowerCase())
  );

  const inputStyle = { background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-1)" };

  const highFitCount = filtered.filter((l) => (l.score ?? 0) >= 70).length;

  return (
    <div className="bg-grid">
      <PageHeader
        eyebrow="ABA-INTEL · UNIVERSE"
        title="Deal Universe"
        subtitle="Full database of scored ABA listings"
        liveBadge={
          <RealtimeWatcher
            tables={["broker_signals"]}
            channelKey="universe"
            onChange={load}
            debounceMs={300}
          />
        }
        rail={
          <>
            <RailStat label="LISTINGS" value={filtered.length.toLocaleString()} tone="data" />
            <RailStat label="HIGH-FIT" value={highFitCount.toLocaleString()} tone="positive" />
          </>
        }
      />
      <div className="p-8 pt-6">

      {/* Filters */}
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-3)" }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search listings..."
            className="w-full pl-9 pr-4 py-2 rounded-lg text-sm outline-none focus:ring-1"
            style={inputStyle}
          />
        </div>
        <select
          value={stateFilter}
          onChange={e => setStateFilter(e.target.value)}
          className="px-3 py-2 rounded-lg text-sm outline-none"
          style={inputStyle}
        >
          <option value="all">All States</option>
          <optgroup label="Midwest (Target)">
            {MIDWEST.map(s => <option key={s} value={s}>{s}</option>)}
          </optgroup>
        </select>
        <select
          value={scoreMin}
          onChange={e => setScoreMin(Number(e.target.value))}
          className="px-3 py-2 rounded-lg text-sm outline-none"
          style={inputStyle}
        >
          <option value={0}>All Scores</option>
          <option value={70}>High Fit (70+)</option>
          <option value={40}>Medium+ (40+)</option>
        </select>
      </div>

      {/* Count */}
      <p className="text-xs mb-4" style={{ color: "var(--text-3)" }}>{filtered.length} listings shown</p>

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
        <table className="w-full">
          <thead>
            <tr style={{ background: "var(--bg-card)", borderBottom: "1px solid var(--border)" }}>
              {["Score", "Listing", "State", "Revenue", "Asking", "Source", "Status"].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text-3)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-16 text-center text-sm" style={{ color: "var(--text-3)" }}>Loading...</td></tr>
            ) : filtered.map((l) => (
              <tr key={l.id} className="hover:bg-white/[0.02]" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                <td className="px-4 py-3"><ScoreBadge score={l.score} /></td>
                <td className="px-4 py-3 max-w-xs">
                  <div className="flex items-center gap-2">
                    {l.practice_id ? (
                      <Link
                        href={`/practice/${l.practice_id}`}
                        className="text-sm font-medium hover:opacity-80 line-clamp-1"
                        style={{ color: "var(--text-1)" }}
                      >
                        {l.listing_title || "Untitled"}
                      </Link>
                    ) : (
                      <a
                        href={l.listing_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium hover:opacity-80 line-clamp-1"
                        style={{ color: "var(--text-1)" }}
                      >
                        {l.listing_title || "Untitled"}
                      </a>
                    )}
                    {l.practice_id && l.listing_url && (
                      <a
                        href={l.listing_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Open broker listing"
                        className="hover:opacity-100 shrink-0"
                        style={{ color: "var(--text-3)", opacity: 0.7 }}
                      >
                        <ExternalLink size={11} />
                      </a>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span
                    className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-semibold"
                    style={{
                      color: MIDWEST.includes(l.location_state) ? "var(--data)" : "var(--text-3)",
                      background: MIDWEST.includes(l.location_state) ? "rgba(77,217,230,0.08)" : "rgba(155,165,184,0.06)",
                    }}
                  >
                    {l.location_state || "—"}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-sm" style={{ color: "var(--text-2)" }}>{fmt(l.revenue_claimed)}</td>
                <td className="px-4 py-3 font-mono text-sm" style={{ color: "var(--text-2)" }}>{fmt(l.asking_price)}</td>
                <td className="px-4 py-3 text-xs capitalize" style={{ color: "var(--text-3)" }}>{l.source_site}</td>
                <td className="px-4 py-3">
                  <StatusSelect id={l.id} status={l.status} />
                </td>
              </tr>
            ))}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={7}>
                  <EmptyState
                    icon={Database}
                    title="No matching listings"
                    body="Adjust the filters above, or wait for the next scrape — runs daily at 06:00 Central."
                    size="lg"
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      </div>
    </div>
  );
}

function StatusSelect({ id, status }: { id: string; status: string }) {
  const [val, setVal] = useState(status || "new");
  const supabase = createClient();

  async function update(newStatus: string) {
    setVal(newStatus);
    const { error } = await supabase.rpc("set_listing_status", {
      p_id: id,
      p_status: newStatus,
      p_source: "ui",
    });
    if (error) {
      await supabase.from("broker_signals").update({ status: newStatus }).eq("id", id);
    }
  }

  return (
    <select
      value={val}
      onChange={e => update(e.target.value)}
      onClick={e => e.stopPropagation()}
      className="px-2 py-1 rounded text-xs outline-none capitalize"
      style={{
        background: "var(--bg-base)",
        border: "1px solid var(--border)",
        color: STATUS_COLOR[val] || "var(--text-2)",
      }}
    >
      <option value="new">New</option>
      <option value="reviewing">Reviewing</option>
      <option value="pursuing">Pursuing</option>
      <option value="passed">Passed</option>
      <option value="closed">Closed</option>
    </select>
  );
}
