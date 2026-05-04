"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ScoreBadge } from "@/components/score-badge";
import { Search } from "lucide-react";

const MIDWEST = ["IL","OH","MI","IN","WI","MN","IA","MO","KS","NE","KY","ND","SD"];

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

  useEffect(() => {
    async function load() {
      setLoading(true);
      let q = supabase.from("broker_signals").select("*").order("score", { ascending: false }).limit(200);
      if (stateFilter !== "all") q = q.eq("location_state", stateFilter);
      if (scoreMin > 0) q = q.gte("score", scoreMin);
      const { data } = await q;
      setListings(data || []);
      setLoading(false);
    }
    load();
  }, [stateFilter, scoreMin]);

  const filtered = listings.filter(l =>
    !search || (l.listing_title || "").toLowerCase().includes(search.toLowerCase()) ||
    (l.location_city || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-white text-2xl font-semibold">Deal Universe</h1>
        <p className="text-slate-400 text-sm mt-1">Full database of scored ABA listings</p>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search listings..."
            className="w-full pl-9 pr-4 py-2 rounded-lg text-sm text-white outline-none focus:ring-1 focus:ring-blue-500"
            style={{ background: "#161B27", border: "1px solid #2A3347" }}
          />
        </div>
        <select
          value={stateFilter}
          onChange={e => setStateFilter(e.target.value)}
          className="px-3 py-2 rounded-lg text-sm text-white outline-none"
          style={{ background: "#161B27", border: "1px solid #2A3347" }}
        >
          <option value="all">All States</option>
          <optgroup label="Midwest (Target)">
            {MIDWEST.map(s => <option key={s} value={s}>{s}</option>)}
          </optgroup>
        </select>
        <select
          value={scoreMin}
          onChange={e => setScoreMin(Number(e.target.value))}
          className="px-3 py-2 rounded-lg text-sm text-white outline-none"
          style={{ background: "#161B27", border: "1px solid #2A3347" }}
        >
          <option value={0}>All Scores</option>
          <option value={70}>High Fit (70+)</option>
          <option value={40}>Medium+ (40+)</option>
        </select>
      </div>

      {/* Count */}
      <p className="text-slate-500 text-xs mb-4">{filtered.length} listings</p>

      {/* Table */}
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: "#2A3347" }}>
        <table className="w-full">
          <thead>
            <tr className="border-b" style={{ background: "#161B27", borderColor: "#2A3347" }}>
              {["Score", "Listing", "State", "Revenue", "Asking", "Source", "Status"].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-16 text-center text-slate-500 text-sm">Loading...</td></tr>
            ) : filtered.map((l) => (
              <tr key={l.id} className="border-b hover:bg-white/[0.02] cursor-pointer" style={{ borderColor: "#2A3347" }}>
                <td className="px-4 py-3"><ScoreBadge score={l.score} /></td>
                <td className="px-4 py-3 max-w-xs">
                  <a href={l.listing_url} target="_blank" rel="noopener noreferrer" className="text-white text-sm font-medium hover:text-blue-400 line-clamp-1">
                    {l.listing_title || "Untitled"}
                  </a>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-semibold ${MIDWEST.includes(l.location_state) ? "text-blue-300 bg-blue-500/10" : "text-slate-400 bg-slate-500/10"}`}>
                    {l.location_state || "—"}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-sm text-slate-300">{fmt(l.revenue_claimed)}</td>
                <td className="px-4 py-3 font-mono text-sm text-slate-300">{fmt(l.asking_price)}</td>
                <td className="px-4 py-3 text-slate-400 text-xs capitalize">{l.source_site}</td>
                <td className="px-4 py-3">
                  <StatusSelect id={l.id} status={l.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusSelect({ id, status }: { id: string; status: string }) {
  const [val, setVal] = useState(status || "new");
  const supabase = createClient();

  async function update(newStatus: string) {
    setVal(newStatus);
    await supabase.from("broker_signals").update({ status: newStatus }).eq("id", id);
  }

  return (
    <select
      value={val}
      onChange={e => update(e.target.value)}
      onClick={e => e.stopPropagation()}
      className="px-2 py-1 rounded text-xs outline-none capitalize"
      style={{ background: "#0C0E14", border: "1px solid #2A3347", color: val === "pursuing" ? "#22C55E" : val === "reviewing" ? "#F59E0B" : "#94A3B8" }}
    >
      <option value="new">New</option>
      <option value="reviewing">Reviewing</option>
      <option value="pursuing">Pursuing</option>
      <option value="passed">Passed</option>
      <option value="closed">Closed</option>
    </select>
  );
}
