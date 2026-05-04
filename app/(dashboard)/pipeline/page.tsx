"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ScoreBadge } from "@/components/score-badge";

const STAGES = ["new", "reviewing", "pursuing", "passed", "closed"] as const;
const STAGE_LABELS: Record<string, string> = {
  new: "New", reviewing: "Reviewing", pursuing: "Pursuing", passed: "Passed", closed: "Closed"
};
const STAGE_COLORS: Record<string, string> = {
  new: "#64748B", reviewing: "#F59E0B", pursuing: "#3B82F6", passed: "#EF4444", closed: "#22C55E"
};

function fmt(n: number | null) {
  if (n == null) return null;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

export default function Pipeline() {
  const [listings, setListings] = useState<any[]>([]);
  const supabase = createClient();

  useEffect(() => {
    supabase.from("broker_signals").select("*").order("score", { ascending: false }).limit(500)
      .then(({ data }) => setListings(data || []));
  }, []);

  async function moveStage(id: string, newStatus: string) {
    setListings(prev => prev.map(l => l.id === id ? { ...l, status: newStatus } : l));
    await supabase.from("broker_signals").update({ status: newStatus }).eq("id", id);
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-white text-2xl font-semibold">Pipeline</h1>
        <p className="text-slate-400 text-sm mt-1">Click a stage button on a card to move it</p>
      </div>

      <div className="grid grid-cols-5 gap-4">
        {STAGES.map(stage => {
          const stageListing = listings.filter(l => (l.status || "new") === stage);
          return (
            <div key={stage} className="rounded-xl border overflow-hidden" style={{ borderColor: "#2A3347" }}>
              {/* Column header */}
              <div className="px-3 py-3 border-b flex items-center gap-2" style={{ background: "#161B27", borderColor: "#2A3347" }}>
                <div className="w-2 h-2 rounded-full" style={{ background: STAGE_COLORS[stage] }} />
                <span className="text-white text-xs font-medium">{STAGE_LABELS[stage]}</span>
                <span className="ml-auto text-slate-500 text-xs font-mono">{stageListing.length}</span>
              </div>

              {/* Cards */}
              <div className="p-2 space-y-2 min-h-32" style={{ background: "#0C0E14" }}>
                {stageListing.map(l => (
                  <div
                    key={l.id}
                    className="rounded-lg p-3 border cursor-pointer hover:border-blue-500/50 transition-colors"
                    style={{ background: "#161B27", borderColor: "#2A3347" }}
                  >
                    <p className="text-white text-xs font-medium line-clamp-2 mb-2 leading-relaxed">
                      {l.listing_title || "Untitled"}
                    </p>
                    <div className="flex items-center gap-2 mb-2">
                      <ScoreBadge score={l.score} />
                      {l.location_state && (
                        <span className="text-xs font-mono text-blue-300 bg-blue-500/10 px-1.5 py-0.5 rounded">
                          {l.location_state}
                        </span>
                      )}
                    </div>
                    {(l.revenue_claimed || l.asking_price) && (
                      <p className="text-slate-500 text-xs font-mono">
                        {fmt(l.revenue_claimed) && `Rev: ${fmt(l.revenue_claimed)}`}
                        {fmt(l.asking_price) && ` · Ask: ${fmt(l.asking_price)}`}
                      </p>
                    )}
                    {/* Stage buttons */}
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {STAGES.filter(s => s !== stage).slice(0, 3).map(s => (
                        <button
                          key={s}
                          onClick={() => moveStage(l.id, s)}
                          className="text-xs px-2 py-0.5 rounded text-slate-400 hover:text-white transition-colors"
                          style={{ background: "#0C0E14", border: "1px solid #2A3347" }}
                        >
                          → {STAGE_LABELS[s]}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                {stageListing.length === 0 && (
                  <p className="text-slate-600 text-xs text-center py-6">Empty</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
