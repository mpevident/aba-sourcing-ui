import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { KpiCard } from "@/components/kpi-card";
import { StateMap } from "@/components/state-map";
import { ScoreHistogram } from "@/components/score-histogram";
import { SourceBar } from "@/components/source-bar";
import { LeadTable } from "@/components/lead-table";
import { ActivityFeed } from "@/components/activity-feed";
import { ScoreBadge } from "@/components/score-badge";
import { ScraperHealth } from "@/components/scraper-health";
import { ScheduledRuns } from "@/components/scheduled-runs";
import { RealtimeWatcher } from "@/components/realtime-watcher";
import { PageHeader, RailStat } from "@/components/page-header";

function fmtRelative(s: string | null | undefined) {
  if (!s) return "—";
  const ms = Date.now() - new Date(s).getTime();
  const mins = Math.floor(ms / 60_000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

function statusColorFor(s: string | null | undefined) {
  if (s === "pursuing") return "var(--data)";
  if (s === "passed") return "var(--critical)";
  if (s === "closed") return "var(--positive)";
  if (s === "reviewing") return "var(--warning)";
  return "var(--text-2)";
}

function RecentStatusMoves({ rows }: { rows: any[] }) {
  return (
    <div className="flex flex-col" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
      <div className="px-4 py-2.5 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border)" }}>
        <span className="mono text-[10px] tracking-[0.18em]" style={{ color: "var(--text-3)" }}>
          STATUS MOVES
        </span>
        <span className="mono text-[9px] tracking-[0.15em]" style={{ color: "var(--text-3)" }}>
          AUDIT
        </span>
      </div>
      {rows.length === 0 && (
        <div className="px-4 py-6 mono text-[11px]" style={{ color: "var(--text-3)" }}>
          NO STATUS MOVES YET
        </div>
      )}
      {rows.map((r) => (
        <div
          key={r.id}
          className="px-4 py-2 flex items-center gap-3 hover:bg-white/[0.02] transition-colors"
          style={{ borderBottom: "1px solid var(--border-subtle)" }}
        >
          <span className="mono text-[10px] tnum w-12 shrink-0" style={{ color: "var(--text-3)" }}>
            {fmtRelative(r.changed_at)}
          </span>
          <div className="flex-1 min-w-0 flex items-center gap-2">
            <span className="mono text-[10px]" style={{ color: "var(--text-3)" }}>
              {r.from_status || "—"}
            </span>
            <span style={{ color: "var(--text-3)" }}>→</span>
            <span
              className="mono text-[10px] tracking-[0.12em] uppercase"
              style={{ color: statusColorFor(r.to_status) }}
            >
              {r.to_status}
            </span>
            <span className="mono text-[9px] truncate" style={{ color: "var(--text-3)" }}>
              · {r.target_table}/{String(r.target_id).slice(0, 8)}
            </span>
          </div>
          {r.source && (
            <span
              className="mono text-[9px] tracking-[0.12em] uppercase shrink-0"
              style={{ color: r.source === "ui" ? "var(--data)" : r.source === "trigger" ? "var(--text-3)" : "var(--signal)" }}
            >
              {r.source}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

function TopProbabilities({ rows }: { rows: any[] }) {
  return (
    <div className="flex flex-col" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
      <div className="px-4 py-2.5 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border)" }}>
        <span className="mono text-[10px] tracking-[0.18em]" style={{ color: "var(--text-3)" }}>
          TOP SELLER PROBABILITY
        </span>
        <span className="mono text-[9px] tracking-[0.15em]" style={{ color: "var(--text-3)" }}>
          LAYER 3
        </span>
      </div>
      {rows.length === 0 && (
        <div className="px-4 py-6 mono text-[11px]" style={{ color: "var(--text-3)" }}>
          NO SCORED PRACTICES YET
        </div>
      )}
      {rows.map((r) => {
        const practiceName = r.practices?.name as string | undefined;
        const practiceState = r.practices?.state as string | undefined;
        const inner = (
          <div
            className="px-4 py-2 flex items-center gap-3 hover:bg-white/[0.02] transition-colors"
            style={{ borderBottom: "1px solid var(--border-subtle)" }}
          >
            <ScoreBadge score={r.score} />
            <div className="flex-1 min-w-0">
              <div className="text-[11.5px] truncate" style={{ color: "var(--text-1)" }}>
                {practiceName || "—"}
              </div>
              <div className="mono text-[9.5px]" style={{ color: "var(--text-3)" }}>
                {practiceState || "—"}
              </div>
            </div>
          </div>
        );
        return r.practice_id ? (
          <Link key={`${r.practice_id}-${r.computed_at}`} href={`/practice/${r.practice_id}`} className="block">
            {inner}
          </Link>
        ) : (
          <div key={`${r.practice_id ?? "x"}-${r.computed_at}`}>{inner}</div>
        );
      })}
    </div>
  );
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

const MIDWEST = ["IL","OH","MI","IN","WI","MN","IA","MO","KS","NE","KY","ND","SD"];

function pctDelta(current: number | null | undefined, prior: number | null | undefined): number | undefined {
  if (current == null || prior == null) return undefined;
  if (prior === 0) return current === 0 ? undefined : 100;
  return ((current - prior) / prior) * 100;
}

export default async function IntelligenceFeed() {
  const supabase = await createClient();

  const now = new Date();
  const sevenDaysAgoISO = new Date(now.getTime() - 7 * 86_400_000).toISOString();
  const fourteenDaysAgoISO = new Date(now.getTime() - 14 * 86_400_000).toISOString();

  const [
    { data: signals },
    { count: totalSignals },
    { count: highFitCount },
    { count: pursuingCount },
    { count: scoredCount },
    { count: practicesCount },
    { count: outreachCount },
    { data: recentSignals },
    { data: scoreRows },
    { data: trendRows },
    { count: signalsLast7 },
    { count: signalsPrior7 },
    { count: highFitLast7 },
    { count: highFitPrior7 },
    { count: outreachLast7 },
    { count: outreachPrior7 },
    { data: layer3Signals },
    { data: topProbabilities },
    { data: recentStatusMoves },
  ] = await Promise.all([
    supabase
      .from("broker_signals")
      .select("*")
      .order("score", { ascending: false, nullsFirst: false })
      .limit(15),
    supabase.from("broker_signals").select("*", { count: "exact", head: true }),
    supabase.from("broker_signals").select("*", { count: "exact", head: true }).gte("score", 70),
    supabase.from("broker_signals").select("*", { count: "exact", head: true }).eq("status", "pursuing"),
    supabase.from("broker_signals").select("*", { count: "exact", head: true }).eq("scored", true),
    supabase.from("practices").select("*", { count: "exact", head: true }),
    supabase.from("outreach_log").select("*", { count: "exact", head: true }),
    supabase
      .from("broker_signals")
      .select("id, listing_title, listing_url, source_site, location_state, score, cst_fit, first_seen_at, scored, practice_id")
      .order("first_seen_at", { ascending: false })
      .limit(20),
    supabase
      .from("broker_signals")
      .select("score, source_site, location_state")
      .not("score", "is", null)
      .limit(10000),
    supabase
      .from("broker_signals")
      .select("first_seen_at")
      .gte("first_seen_at", fourteenDaysAgoISO)
      .limit(10000),
    supabase
      .from("broker_signals")
      .select("*", { count: "exact", head: true })
      .gte("first_seen_at", sevenDaysAgoISO),
    supabase
      .from("broker_signals")
      .select("*", { count: "exact", head: true })
      .gte("first_seen_at", fourteenDaysAgoISO)
      .lt("first_seen_at", sevenDaysAgoISO),
    supabase
      .from("broker_signals")
      .select("*", { count: "exact", head: true })
      .gte("score", 70)
      .gte("first_seen_at", sevenDaysAgoISO),
    supabase
      .from("broker_signals")
      .select("*", { count: "exact", head: true })
      .gte("score", 70)
      .gte("first_seen_at", fourteenDaysAgoISO)
      .lt("first_seen_at", sevenDaysAgoISO),
    supabase
      .from("outreach_log")
      .select("*", { count: "exact", head: true })
      .gte("created_at", sevenDaysAgoISO),
    supabase
      .from("outreach_log")
      .select("*", { count: "exact", head: true })
      .gte("created_at", fourteenDaysAgoISO)
      .lt("created_at", sevenDaysAgoISO),
    supabase
      .from("signals")
      .select("id, signal_type, weight, source, observed_at, summary, practice_id, practices(name, state)")
      .order("observed_at", { ascending: false })
      .limit(15),
    supabase
      .from("scores")
      .select("score, practice_id, computed_at, practices(name, state)")
      .order("score", { ascending: false, nullsFirst: false })
      .limit(8),
    supabase
      .from("status_changes")
      .select("id, target_table, target_id, from_status, to_status, source, changed_at")
      .order("changed_at", { ascending: false })
      .limit(10),
  ]);

  // Aggregate state / source / score distribution
  const stateCounts: Record<string, number> = {};
  const sourceCounts: Record<string, number> = {};
  const scoreDistribution: number[] = [];

  for (const r of (scoreRows || [])) {
    if (r.location_state) stateCounts[r.location_state] = (stateCounts[r.location_state] || 0) + 1;
    if (r.source_site) sourceCounts[r.source_site] = (sourceCounts[r.source_site] || 0) + 1;
    if (r.score != null) scoreDistribution.push(r.score);
  }

  // Real 14-day trend bucketed by day from first_seen_at
  const trendBuckets = new Array(14).fill(0);
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  for (const r of (trendRows || [])) {
    if (!r.first_seen_at) continue;
    const d = new Date(r.first_seen_at);
    const days = Math.floor((todayStart.getTime() - d.getTime()) / 86_400_000);
    if (days >= 0 && days < 14) trendBuckets[13 - days]++;
  }

  const midwestCount = MIDWEST.reduce((s, c) => s + (stateCounts[c] || 0), 0);
  const otherCount = (totalSignals || 0) - midwestCount;

  // Real period-over-period deltas
  const signalsDelta = pctDelta(signalsLast7, signalsPrior7);
  const highFitDelta = pctDelta(highFitLast7, highFitPrior7);
  const outreachDelta = pctDelta(outreachLast7, outreachPrior7);

  // Scored coverage — replaces the fake SONNET-4.6 badge
  const scoredCoverage = totalSignals && totalSignals > 0
    ? ((scoredCount || 0) / totalSignals * 100).toFixed(0)
    : "0";

  const events = (recentSignals as any[] || []).slice(0, 12).map((r) => ({
    id: r.id,
    ts: r.first_seen_at || new Date().toISOString(),
    kind: r.scored ? ("score" as const) : ("ingest" as const),
    title: r.listing_title || "Untitled listing",
    detail: r.source_site ? `${r.source_site}` : undefined,
    state: r.location_state,
    score: r.score,
    href: r.practice_id ? `/practice/${r.practice_id}` : undefined,
  }));

  const layer3Events = (layer3Signals as any[] || []).map((s) => {
    const practiceName = s.practices?.name as string | undefined;
    const practiceState = s.practices?.state as string | undefined;
    return {
      id: s.id,
      ts: s.observed_at || new Date().toISOString(),
      kind: "signal" as const,
      title: practiceName || s.signal_type || "Unknown practice",
      detail: [s.signal_type, s.source, s.summary].filter(Boolean).join(" · "),
      state: practiceState ?? null,
      score: s.weight ?? null,
      href: s.practice_id ? `/practice/${s.practice_id}` : undefined,
    };
  });

  const lastIngestISO = (recentSignals as any[] | null)?.[0]?.first_seen_at
    ? new Date((recentSignals as any[])[0].first_seen_at).toISOString().slice(0, 19) + "Z"
    : "—";

  return (
    <div className="bg-grid">
      <PageHeader
        eyebrow="ABA-INTEL · OPS:01"
        title="Intelligence Feed"
        subtitle="CST Academy proprietary acquisition sourcing — Midwest priority · 13 target states"
        liveBadge={
          <RealtimeWatcher
            tables={["broker_signals", "status_changes", "signals", "scores"]}
            channelKey="home-feed"
          />
        }
        rail={
          <>
            <RailStat label="LAST INGEST" value={lastIngestISO} tone="data" />
            <RailStat label="HORIZON" value="14D ROLLING" />
            <RailStat label="SCORED" value={`${scoredCoverage}%`} />
          </>
        }
      />

      {/* KPI strip */}
      <div className="px-6 pt-6 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
        <KpiCard
          label="Practices · universe"
          value={(practicesCount || 0).toLocaleString()}
          sub="IL seed cohort · 13 states pending"
          trend={trendBuckets.map(v => Math.max(1, v + 3))}
          accent="data"
        />
        <KpiCard
          label="Broker signals"
          value={(totalSignals || 0).toLocaleString()}
          sub={`${midwestCount} midwest · ${otherCount} other`}
          delta={signalsDelta}
          trend={trendBuckets}
          accent="signal"
        />
        <KpiCard
          label="High-fit (≥70)"
          value={(highFitCount || 0).toLocaleString()}
          sub={`${totalSignals ? ((highFitCount || 0) / totalSignals * 100).toFixed(1) : "0.0"}% of signals`}
          delta={highFitDelta}
          accent="positive"
        />
        <KpiCard
          label="Active pursuit"
          value={(pursuingCount || 0).toLocaleString()}
          sub="awaiting NDA / IOI"
          accent="action"
        />
        <KpiCard
          label="Outreach sent"
          value={(outreachCount || 0).toLocaleString()}
          sub={`${signalsLast7 ?? 0} new signals · last 7d`}
          delta={outreachDelta}
          accent="warning"
        />
      </div>

      {/* Main grid */}
      <div className="px-6 py-6 grid grid-cols-12 gap-3">
        <div className="col-span-12 xl:col-span-8 flex flex-col gap-3">
          <StateMap counts={stateCounts} />
          <div className="grid grid-cols-2 gap-3">
            <ScoreHistogram scores={scoreDistribution} />
            <SourceBar counts={sourceCounts} />
          </div>
          <LeadTable rows={(signals || []) as any} />
        </div>
        <div className="col-span-12 xl:col-span-4 flex flex-col gap-3">
          <ActivityFeed events={events} />
          <ActivityFeed events={layer3Events} title="SIGNAL STREAM · LAYER 3" />
          <TopProbabilities rows={(topProbabilities as any[]) || []} />
          <RecentStatusMoves rows={(recentStatusMoves as any[]) || []} />
          <ScraperHealth />
          <ScheduledRuns />
        </div>
      </div>
    </div>
  );
}
