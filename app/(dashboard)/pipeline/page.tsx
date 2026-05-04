"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ScoreBadge } from "@/components/score-badge";
import { RealtimeWatcher } from "@/components/realtime-watcher";
import { PageHeader, RailStat } from "@/components/page-header";

const STAGES = ["new", "reviewing", "pursuing", "passed", "closed"] as const;
type Stage = typeof STAGES[number];

const STAGE_LABELS: Record<Stage, string> = {
  new: "New", reviewing: "Reviewing", pursuing: "Pursuing", passed: "Passed", closed: "Closed",
};
const STAGE_COLORS: Record<Stage, string> = {
  new: "var(--text-3)",
  reviewing: "var(--warning)",
  pursuing: "var(--data)",
  passed: "var(--critical)",
  closed: "var(--positive)",
};

function fmt(n: number | null) {
  if (n == null) return null;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

const DRAG_MIME = "application/x-broker-signal-id";

export default function Pipeline() {
  const [listings, setListings] = useState<any[]>([]);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<Stage | null>(null);
  const supabase = createClient();

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("broker_signals")
      .select("*")
      .order("score", { ascending: false })
      .limit(500);
    setListings(data || []);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  async function moveStage(id: string, newStatus: Stage) {
    setListings(prev => prev.map(l => l.id === id ? { ...l, status: newStatus } : l));
    // RPC sets app.audit_source='ui' before update so the audit trigger stamps it correctly.
    // Falls back to direct update if the RPC isn't deployed yet.
    const { error } = await supabase.rpc("set_listing_status", {
      p_id: id,
      p_status: newStatus,
      p_source: "ui",
    });
    if (error) {
      await supabase.from("broker_signals").update({ status: newStatus }).eq("id", id);
    }
  }

  function onDragStart(e: React.DragEvent, id: string) {
    e.dataTransfer.setData(DRAG_MIME, id);
    e.dataTransfer.effectAllowed = "move";
    setDraggingId(id);
  }

  function onDragEnd() {
    setDraggingId(null);
    setDropTarget(null);
  }

  function onDragOver(e: React.DragEvent, stage: Stage) {
    if (!e.dataTransfer.types.includes(DRAG_MIME)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dropTarget !== stage) setDropTarget(stage);
  }

  function onDrop(e: React.DragEvent, stage: Stage) {
    e.preventDefault();
    const id = e.dataTransfer.getData(DRAG_MIME);
    setDropTarget(null);
    setDraggingId(null);
    if (!id) return;
    const cur = listings.find((l) => l.id === id);
    if (!cur) return;
    if ((cur.status || "new") === stage) return;
    moveStage(id, stage);
  }

  const pursuingCount = listings.filter((l) => (l.status || "new") === "pursuing").length;
  const reviewingCount = listings.filter((l) => (l.status || "new") === "reviewing").length;

  return (
    <div className="bg-grid">
      <PageHeader
        eyebrow="ABA-INTEL · PIPELINE"
        title="Pipeline"
        subtitle="Drag a card between columns to move stages · live across operators"
        liveBadge={
          <RealtimeWatcher
            tables={["broker_signals"]}
            channelKey="pipeline"
            onChange={load}
            debounceMs={300}
          />
        }
        rail={
          <>
            <RailStat label="REVIEWING" value={reviewingCount} tone="warning" />
            <RailStat label="PURSUING" value={pursuingCount} tone="data" />
            <RailStat label="TOTAL" value={listings.length} />
          </>
        }
      />
      <div className="p-4 md:p-8 pt-6 overflow-x-auto">
        <div className="grid grid-cols-5 gap-3 md:gap-4 min-w-[1100px]">
          {STAGES.map((stage) => {
            const stageListing = listings.filter((l) => (l.status || "new") === stage);
            const isDropTarget = dropTarget === stage;
            return (
              <div
                key={stage}
                onDragOver={(e) => onDragOver(e, stage)}
                onDragLeave={() => { if (dropTarget === stage) setDropTarget(null); }}
                onDrop={(e) => onDrop(e, stage)}
                className="rounded-xl overflow-hidden transition-colors"
                style={{
                  border: `1px solid ${isDropTarget ? STAGE_COLORS[stage] : "var(--border)"}`,
                  background: isDropTarget ? "rgba(77,217,230,0.02)" : undefined,
                }}
              >
                {/* Column header */}
                <div
                  className="px-3 py-3 flex items-center gap-2"
                  style={{ background: "var(--bg-card)", borderBottom: "1px solid var(--border)" }}
                >
                  <div className="w-2 h-2 rounded-full" style={{ background: STAGE_COLORS[stage] }} />
                  <span className="text-xs font-medium" style={{ color: "var(--text-1)" }}>
                    {STAGE_LABELS[stage]}
                  </span>
                  <span className="ml-auto text-xs font-mono" style={{ color: "var(--text-3)" }}>
                    {stageListing.length}
                  </span>
                </div>

                {/* Cards */}
                <div className="p-2 space-y-2 min-h-[140px]" style={{ background: "var(--bg-base)" }}>
                  {stageListing.map((l) => {
                    const isDragging = draggingId === l.id;
                    return (
                      <div
                        key={l.id}
                        draggable
                        onDragStart={(e) => onDragStart(e, l.id)}
                        onDragEnd={onDragEnd}
                        className="rounded-lg p-3 cursor-grab active:cursor-grabbing transition-all hover:translate-y-[-1px]"
                        style={{
                          background: "var(--bg-card)",
                          border: "1px solid var(--border)",
                          borderLeft: `2px solid ${STAGE_COLORS[stage]}`,
                          opacity: isDragging ? 0.4 : 1,
                        }}
                      >
                        {l.practice_id ? (
                          <Link
                            href={`/practice/${l.practice_id}`}
                            draggable={false}
                            onDragStart={(e) => e.preventDefault()}
                            className="text-xs font-medium line-clamp-2 mb-2 leading-relaxed block hover:opacity-80"
                            style={{ color: "var(--text-1)" }}
                          >
                            {l.listing_title || "Untitled"}
                          </Link>
                        ) : (
                          <p className="text-xs font-medium line-clamp-2 mb-2 leading-relaxed" style={{ color: "var(--text-1)" }}>
                            {l.listing_title || "Untitled"}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mb-2">
                          <ScoreBadge score={l.score} />
                          {l.location_state && (
                            <span
                              className="text-xs font-mono px-1.5 py-0.5 rounded"
                              style={{ color: "var(--data)", background: "rgba(77,217,230,0.08)" }}
                            >
                              {l.location_state}
                            </span>
                          )}
                        </div>
                        {(l.revenue_claimed || l.asking_price) && (
                          <p className="text-xs font-mono" style={{ color: "var(--text-3)" }}>
                            {fmt(l.revenue_claimed) && `Rev: ${fmt(l.revenue_claimed)}`}
                            {fmt(l.asking_price) && ` · Ask: ${fmt(l.asking_price)}`}
                          </p>
                        )}
                      </div>
                    );
                  })}
                  {stageListing.length === 0 && (
                    <p
                      className="mono text-[9.5px] tracking-[0.18em] text-center py-8 uppercase"
                      style={{ color: isDropTarget ? STAGE_COLORS[stage] : "var(--text-4)" }}
                    >
                      {isDropTarget ? "Drop here" : "No deals"}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
