import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { RealtimeWatcher } from "@/components/realtime-watcher";
import { PageHeader, RailStat } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Radar } from "lucide-react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const WINDOWS: Record<string, { label: string; days: number | null }> = {
  "24h": { label: "24h", days: 1 },
  "7d": { label: "7d", days: 7 },
  "30d": { label: "30d", days: 30 },
  all: { label: "All", days: null },
};

function fmtRelative(s: string | null | undefined) {
  if (!s) return "—";
  const ms = Date.now() - new Date(s).getTime();
  const mins = Math.floor(ms / 60_000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d`;
  return `${Math.floor(days / 30)}mo`;
}

export default async function SignalStreamPage({
  searchParams,
}: {
  searchParams: Promise<{ window?: string; type?: string }>;
}) {
  const { window: rawWindow = "7d", type } = await searchParams;
  const w = WINDOWS[rawWindow] ? rawWindow : "7d";
  const windowSpec = WINDOWS[w];

  const supabase = await createClient();

  let signalsQuery = supabase
    .from("signals")
    .select("id, signal_type, weight, source, observed_at, summary, raw_url, practice_id, practices(name, state)")
    .order("observed_at", { ascending: false })
    .limit(200);

  let typeAggQuery = supabase
    .from("signals")
    .select("signal_type")
    .limit(10000);

  // Compute cutoff once so we don't call Date.now() multiple times in render.
  const sinceISO =
    windowSpec.days != null
      ? new Date(Date.now() - windowSpec.days * 86_400_000).toISOString()
      : null;

  if (sinceISO) {
    signalsQuery = signalsQuery.gte("observed_at", sinceISO);
    typeAggQuery = typeAggQuery.gte("observed_at", sinceISO);
  }
  if (type) {
    signalsQuery = signalsQuery.eq("signal_type", type);
  }

  const [{ data: signals }, { data: typeAggRows }, { count: totalInWindow }] = await Promise.all([
    signalsQuery,
    typeAggQuery,
    sinceISO
      ? supabase
          .from("signals")
          .select("*", { count: "exact", head: true })
          .gte("observed_at", sinceISO)
      : supabase.from("signals").select("*", { count: "exact", head: true }),
  ]);

  // Aggregate signal_type counts within the window for the filter pills
  const typeCounts: Record<string, number> = {};
  for (const r of (typeAggRows as any[] | null) || []) {
    const t = r.signal_type as string | null;
    if (!t) continue;
    typeCounts[t] = (typeCounts[t] || 0) + 1;
  }
  const topTypes = Object.entries(typeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  const uniquePractices = new Set((signals as any[] || []).map((s) => s.practice_id).filter(Boolean)).size;

  return (
    <div className="bg-grid">
      <PageHeader
        eyebrow="ABA-INTEL · LAYER 3"
        title="Signal Stream"
        subtitle="Per-practice seller-intent breadcrumbs · weighted into rolling probability"
        liveBadge={<RealtimeWatcher tables={["signals"]} channelKey="signals-stream" />}
        rail={
          <>
            <RailStat label="WINDOW" value={windowSpec.label.toUpperCase()} />
            <RailStat label="EVENTS" value={(totalInWindow || 0).toLocaleString()} tone="data" />
            <RailStat label="PRACTICES" value={uniquePractices} />
          </>
        }
      />

      {/* Filter strip */}
      <div className="px-6 py-4 flex items-center flex-wrap gap-2" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
        <span className="mono text-[9px] tracking-[0.18em] mr-2" style={{ color: "var(--text-3)" }}>
          WINDOW
        </span>
        {Object.entries(WINDOWS).map(([key, spec]) => {
          const active = key === w;
          const href = `/signals?window=${key}${type ? `&type=${encodeURIComponent(type)}` : ""}`;
          return (
            <Link
              key={key}
              href={href}
              className="mono text-[10px] tracking-[0.12em] px-2.5 py-1"
              style={{
                color: active ? "var(--data)" : "var(--text-2)",
                background: active ? "rgba(77,217,230,0.08)" : "transparent",
                border: `1px solid ${active ? "var(--border-bright)" : "var(--border)"}`,
              }}
            >
              {spec.label.toUpperCase()}
            </Link>
          );
        })}

        {topTypes.length > 0 && (
          <>
            <span className="mono text-[9px] tracking-[0.18em] mx-3" style={{ color: "var(--text-3)" }}>
              TYPE
            </span>
            <Link
              href={`/signals?window=${w}`}
              className="mono text-[10px] tracking-[0.12em] px-2.5 py-1"
              style={{
                color: !type ? "var(--data)" : "var(--text-2)",
                background: !type ? "rgba(77,217,230,0.08)" : "transparent",
                border: `1px solid ${!type ? "var(--border-bright)" : "var(--border)"}`,
              }}
            >
              ALL
            </Link>
            {topTypes.map(([t, n]) => {
              const active = t === type;
              return (
                <Link
                  key={t}
                  href={`/signals?window=${w}&type=${encodeURIComponent(t)}`}
                  className="mono text-[10px] tracking-[0.12em] px-2.5 py-1 flex items-center gap-1.5"
                  style={{
                    color: active ? "var(--data)" : "var(--text-2)",
                    background: active ? "rgba(77,217,230,0.08)" : "transparent",
                    border: `1px solid ${active ? "var(--border-bright)" : "var(--border)"}`,
                  }}
                >
                  {t}
                  <span className="tnum" style={{ color: "var(--text-3)" }}>{n}</span>
                </Link>
              );
            })}
          </>
        )}
      </div>

      {/* Table */}
      <div className="px-6 py-6">
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          <table className="w-full text-[11.5px] mono">
            <thead>
              <tr style={{ background: "var(--bg-surface)" }}>
                {["WHEN", "TYPE", "WT", "PRACTICE", "SUMMARY", "SOURCE", ""].map((h) => (
                  <th
                    key={h}
                    className="text-left font-medium tracking-[0.15em] text-[9px] px-3 py-2"
                    style={{ color: "var(--text-3)", borderBottom: "1px solid var(--border)" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(!signals || signals.length === 0) && (
                <tr>
                  <td colSpan={7}>
                    <EmptyState
                      icon={Radar}
                      title="No signals in this window"
                      body="Layer 3 monitoring is provisioned but not yet ingesting. Try a wider window above, or wait for the engine to write its first signal."
                    />
                  </td>
                </tr>
              )}
              {(signals as any[] || []).map((s) => {
                const practiceName = s.practices?.name as string | undefined;
                const practiceState = s.practices?.state as string | undefined;
                return (
                  <tr key={s.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                    <td className="px-3 py-2.5 tnum" style={{ color: "var(--text-3)" }}>
                      {fmtRelative(s.observed_at)}
                    </td>
                    <td className="px-3 py-2.5 tracking-[0.1em] uppercase" style={{ color: "var(--data)" }}>
                      {s.signal_type || "—"}
                    </td>
                    <td className="px-3 py-2.5 tnum" style={{ color: "var(--text-2)" }}>
                      {s.weight ?? "—"}
                    </td>
                    <td className="px-3 py-2.5">
                      {s.practice_id ? (
                        <Link
                          href={`/practice/${s.practice_id}`}
                          className="font-sans text-[12px] hover:opacity-80"
                          style={{ color: "var(--text-1)" }}
                        >
                          {practiceName || s.practice_id}
                        </Link>
                      ) : (
                        <span className="font-sans text-[12px]" style={{ color: "var(--text-3)" }}>—</span>
                      )}
                      {practiceState && (
                        <span className="ml-2 mono text-[9px] tracking-[0.12em]" style={{ color: "var(--text-3)" }}>
                          · {practiceState}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 max-w-[420px] font-sans text-[11.5px] truncate" style={{ color: "var(--text-2)" }}>
                      {s.summary || "—"}
                    </td>
                    <td className="px-3 py-2.5" style={{ color: "var(--text-3)" }}>
                      {s.source || "—"}
                    </td>
                    <td className="px-3 py-2.5">
                      {s.raw_url && (
                        <a
                          href={s.raw_url}
                          target="_blank"
                          rel="noreferrer"
                          className="mono text-[9px]"
                          style={{ color: "var(--data)" }}
                        >
                          ↗
                        </a>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
