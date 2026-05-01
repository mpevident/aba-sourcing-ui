"use client";
import { Activity, Database, GitCommit, Radar } from "lucide-react";

interface ActivityEvent {
  id: string;
  ts: string;          // ISO date
  kind: "signal" | "ingest" | "score" | "outreach";
  title: string;
  detail?: string;
  state?: string | null;
  score?: number | null;
}

function relTime(iso: string) {
  const t = new Date(iso).getTime();
  const diff = Date.now() - t;
  if (diff < 60_000) return `${Math.floor(diff/1000)}s`;
  if (diff < 3_600_000) return `${Math.floor(diff/60_000)}m`;
  if (diff < 86_400_000) return `${Math.floor(diff/3_600_000)}h`;
  return `${Math.floor(diff/86_400_000)}d`;
}

const KIND_META = {
  signal:   { icon: Radar,      color: "var(--signal)",  label: "SIGNAL" },
  ingest:   { icon: Database,   color: "var(--data)",    label: "INGEST" },
  score:    { icon: GitCommit,  color: "var(--action)",  label: "SCORE"  },
  outreach: { icon: Activity,   color: "var(--positive)",label: "OUTREACH" },
};

export function ActivityFeed({ events, title = "ACTIVITY · LIVE STREAM" }: { events: ActivityEvent[]; title?: string }) {
  return (
    <div className="flex flex-col" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
      <div className="px-4 py-2.5 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border)" }}>
        <span className="mono text-[10px] tracking-[0.18em]" style={{ color: "var(--text-3)" }}>{title}</span>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full status-live" style={{ background: "var(--positive)" }} />
          <span className="mono text-[9px] tracking-[0.15em]" style={{ color: "var(--text-3)" }}>STREAMING</span>
        </div>
      </div>
      <div className="flex flex-col max-h-[440px] overflow-auto">
        {events.length === 0 && (
          <div className="px-4 py-6 mono text-[11px]" style={{ color: "var(--text-3)" }}>
            NO RECENT ACTIVITY · WAITING FOR SCRAPER
          </div>
        )}
        {events.map((e) => {
          const meta = KIND_META[e.kind] || KIND_META.signal;
          const Icon = meta.icon;
          return (
            <div
              key={e.id}
              className="px-4 py-2.5 flex items-start gap-3 transition-colors hover:cursor-pointer"
              style={{ borderBottom: "1px solid var(--border-subtle)" }}
            >
              <div className="flex flex-col items-center pt-0.5">
                <Icon size={11} style={{ color: meta.color }} strokeWidth={2} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-3">
                  <span className="mono text-[8.5px] tracking-[0.18em]" style={{ color: meta.color }}>
                    {meta.label}
                    {e.state && <span style={{ color: "var(--text-3)" }}> · {e.state}</span>}
                  </span>
                  <span className="mono text-[10px] tnum" style={{ color: "var(--text-3)" }}>
                    {relTime(e.ts)}
                  </span>
                </div>
                <div className="text-[11.5px] mt-0.5 truncate" style={{ color: "var(--text-1)" }}>
                  {e.title}
                </div>
                {e.detail && (
                  <div className="text-[10.5px] mt-0.5 truncate mono" style={{ color: "var(--text-3)" }}>
                    {e.detail}
                  </div>
                )}
              </div>
              {e.score != null && (
                <span
                  className="mono text-[10px] tnum px-1.5 py-0.5"
                  style={{
                    color: e.score >= 70 ? "var(--positive)" : e.score >= 40 ? "var(--warning)" : "var(--critical)",
                    border: "1px solid var(--border)",
                  }}
                >
                  {Math.round(e.score)}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
