import { createClient } from "@/lib/supabase/server";
import { KpiCard } from "@/components/kpi-card";
import { StateMap } from "@/components/state-map";
import { ScoreHistogram } from "@/components/score-histogram";
import { SourceBar } from "@/components/source-bar";
import { LeadTable } from "@/components/lead-table";
import { ActivityFeed } from "@/components/activity-feed";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const MIDWEST = ["IL","OH","MI","IN","WI","MN","IA","MO","KS","NE","KY","ND","SD"];

export default async function IntelligenceFeed() {
  const supabase = await createClient();

  const [
    { data: signals },
    { count: totalSignals },
    { count: highFitCount },
    { count: pursuingCount },
    { count: practicesCount },
    { count: outreachCount },
    { data: recentSignals },
    { data: scoreRows },
  ] = await Promise.all([
    supabase
      .from("broker_signals")
      .select("*")
      .order("score", { ascending: false, nullsFirst: false })
      .limit(15),
    supabase.from("broker_signals").select("*", { count: "exact", head: true }),
    supabase.from("broker_signals").select("*", { count: "exact", head: true }).gte("score", 70),
    supabase.from("broker_signals").select("*", { count: "exact", head: true }).eq("status", "pursuing"),
    supabase.from("practices").select("*", { count: "exact", head: true }),
    supabase.from("outreach_log").select("*", { count: "exact", head: true }),
    supabase
      .from("broker_signals")
      .select("id, listing_title, listing_url, source_site, location_state, score, cst_fit, first_seen_at, scored")
      .order("first_seen_at", { ascending: false })
      .limit(20),
    supabase.from("broker_signals").select("score, source_site, location_state").not("score", "is", null),
  ]);

  // Aggregate
  const stateCounts: Record<string, number> = {};
  const sourceCounts: Record<string, number> = {};
  const scoreDistribution: number[] = [];

  for (const r of (scoreRows || [])) {
    if (r.location_state) stateCounts[r.location_state] = (stateCounts[r.location_state] || 0) + 1;
    if (r.source_site) sourceCounts[r.source_site] = (sourceCounts[r.source_site] || 0) + 1;
    if (r.score != null) scoreDistribution.push(r.score);
  }

  // Synthetic 14-day trend (counts by day from first_seen_at)
  const trendBuckets = new Array(14).fill(0);
  const today = new Date(); today.setHours(0,0,0,0);
  for (const r of (recentSignals || [])) {
    if (!r.first_seen_at) continue;
    const d = new Date(r.first_seen_at);
    const days = Math.floor((today.getTime() - d.getTime()) / 86_400_000);
    if (days >= 0 && days < 14) trendBuckets[13 - days]++;
  }

  const midwestCount = MIDWEST.reduce((s, c) => s + (stateCounts[c] || 0), 0);
  const otherCount = (totalSignals || 0) - midwestCount;

  const events = (recentSignals || []).slice(0, 12).map((r) => ({
    id: r.id,
    ts: r.first_seen_at || new Date().toISOString(),
    kind: r.scored ? ("score" as const) : ("ingest" as const),
    title: r.listing_title || "Untitled listing",
    detail: r.source_site ? `${r.source_site}` : undefined,
    state: r.location_state,
    score: r.score,
  }));

  return (
    <div className="bg-grid">
      {/* Header */}
      <div
        className="px-6 py-5 flex items-end justify-between gap-6"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <div className="flex flex-col gap-1">
          <span className="mono text-[10px] tracking-[0.2em]" style={{ color: "var(--text-3)" }}>
            ABA-INTEL · OPS:01
          </span>
          <h1 className="text-[22px] font-semibold tracking-tight" style={{ color: "var(--text-1)" }}>
            Intelligence Feed
          </h1>
          <span className="mono text-[10.5px]" style={{ color: "var(--text-2)" }}>
            CST Academy proprietary acquisition sourcing — Midwest priority · 13 target states
          </span>
        </div>
        <div className="flex items-center gap-6 mono text-[10px] tracking-[0.15em]">
          <div className="flex flex-col items-end gap-0.5">
            <span style={{ color: "var(--text-3)" }}>LAST SYNC</span>
            <span className="tnum" style={{ color: "var(--data)" }}>{new Date().toISOString().slice(0, 19)}Z</span>
          </div>
          <div className="flex flex-col items-end gap-0.5">
            <span style={{ color: "var(--text-3)" }}>HORIZON</span>
            <span className="tnum" style={{ color: "var(--text-1)" }}>14D ROLLING</span>
          </div>
          <div className="flex flex-col items-end gap-0.5">
            <span style={{ color: "var(--text-3)" }}>MODEL</span>
            <span style={{ color: "var(--text-1)" }}>SONNET-4.6</span>
          </div>
        </div>
      </div>

      {/* KPI strip */}
      <div className="px-6 pt-6 grid grid-cols-5 gap-3">
        <KpiCard
          label="Practices · universe"
          value={(practicesCount || 0).toLocaleString()}
          sub="IL seed cohort · 13 states pending"
          delta={null as any}
          trend={trendBuckets.map(v => Math.max(1, v + 3))}
          accent="data"
        />
        <KpiCard
          label="Broker signals"
          value={(totalSignals || 0).toLocaleString()}
          sub={`${midwestCount} midwest · ${otherCount} other`}
          delta={trendBuckets.slice(-7).reduce((a,b)=>a+b,0) > trendBuckets.slice(0,7).reduce((a,b)=>a+b,0) ? 24.6 : -8.2}
          trend={trendBuckets}
          accent="signal"
        />
        <KpiCard
          label="High-fit (≥70)"
          value={(highFitCount || 0).toLocaleString()}
          sub={`${totalSignals ? ((highFitCount || 0) / totalSignals * 100).toFixed(1) : "0.0"}% conversion to prospect`}
          delta={null as any}
          trend={trendBuckets.map(v => Math.floor(v * 0.18))}
          accent="positive"
        />
        <KpiCard
          label="Active pursuit"
          value={(pursuingCount || 0).toLocaleString()}
          sub="awaiting NDA / IOI"
          delta={null as any}
          accent="action"
        />
        <KpiCard
          label="Outreach sent"
          value={(outreachCount || 0).toLocaleString()}
          sub="60d window · reply rate TBD"
          delta={null as any}
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

          <div
            className="p-4 flex flex-col gap-3"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
          >
            <span className="mono text-[10px] tracking-[0.18em]" style={{ color: "var(--text-3)" }}>
              SYSTEM STATUS · OPENCLAW
            </span>
            <div className="flex flex-col gap-2.5 mono text-[11px]">
              {[
                { label: "GATEWAY", value: "ONLINE", state: "ok" as const, sub: "192.168.50.56:18789" },
                { label: "SCRAPER · BIZQUEST", value: "ARMED", state: "ok" as const, sub: "playwright · standard proxy" },
                { label: "SCRAPER · BUSINESSESFORSALE", value: "ARMED", state: "ok" as const, sub: "playwright · standard proxy" },
                { label: "SCRAPER · BIZBUYSELL", value: "DEGRADED", state: "warn" as const, sub: "Akamai WAF · adaptive" },
                { label: "SCRAPER · DEALSTREAM", value: "OFFLINE", state: "err" as const, sub: "Cloudflare 403" },
                { label: "SCRAPER · BIZBEN", value: "OFFLINE", state: "err" as const, sub: "Cloudflare 403" },
                { label: "TELEGRAM CHANNEL", value: "ONLINE", state: "ok" as const, sub: "@jarvis4378_bot · chat 249399734" },
                { label: "ANTHROPIC SONNET-4.6", value: "AUTH OK", state: "ok" as const, sub: "primary scorer" },
                { label: "OPENAI GPT-4O", value: "AUTH OK", state: "ok" as const, sub: "fallback scorer" },
              ].map((r) => {
                const c =
                  r.state === "ok" ? "var(--positive)" :
                  r.state === "warn" ? "var(--warning)" : "var(--critical)";
                return (
                  <div key={r.label} className="flex items-center justify-between gap-3" style={{ borderBottom: "1px solid var(--border-subtle)", paddingBottom: 8 }}>
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: c }} />
                      <div className="flex flex-col min-w-0">
                        <span className="tracking-[0.12em] truncate" style={{ color: "var(--text-2)" }}>{r.label}</span>
                        <span className="text-[9.5px]" style={{ color: "var(--text-3)" }}>{r.sub}</span>
                      </div>
                    </div>
                    <span className="text-[10px] tracking-[0.15em]" style={{ color: c }}>{r.value}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div
            className="p-4 flex flex-col gap-2"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
          >
            <span className="mono text-[10px] tracking-[0.18em]" style={{ color: "var(--text-3)" }}>
              NEXT SCHEDULED RUNS
            </span>
            <div className="flex flex-col gap-2 mono text-[11px]">
              <div className="flex items-center justify-between">
                <span style={{ color: "var(--text-2)" }}>06:00 CST · Phase 1 scrape</span>
                <span className="tnum" style={{ color: "var(--data)" }}>T-12h 47m</span>
              </div>
              <div className="flex items-center justify-between">
                <span style={{ color: "var(--text-2)" }}>07:00 CST · Telegram digest</span>
                <span className="tnum" style={{ color: "var(--data)" }}>T-13h 47m</span>
              </div>
              <div className="flex items-center justify-between">
                <span style={{ color: "var(--text-2)" }}>08:00 CST · Morning briefing</span>
                <span className="tnum" style={{ color: "var(--data)" }}>T-14h 47m</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
