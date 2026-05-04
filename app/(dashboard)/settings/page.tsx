import { createClient } from "@/lib/supabase/server";
import { getRecentRuns } from "@/lib/scrapers";
import { PageHeader, RailStat } from "@/components/page-header";
import pkg from "@/package.json";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type ProbeResult = {
  table: string;
  ok: boolean;
  count: number | null;
  error?: string;
};

const PROBE_TABLES = [
  "practices",
  "broker_signals",
  "bcba_individuals",
  "brokers",
  "signals",
  "scores",
  "outreach_log",
  "status_changes",
] as const;

function classifyKey(key: string | undefined): { kind: string; tone: "ok" | "warn" | "err" } {
  if (!key) return { kind: "missing", tone: "err" };
  if (key.startsWith("sb_publishable_")) return { kind: "publishable (safe in browser)", tone: "ok" };
  if (key.startsWith("sb_secret_")) return { kind: "SECRET KEY — must not ship to browser", tone: "err" };
  if (key.startsWith("eyJ")) return { kind: "legacy JWT — relies on RLS", tone: "warn" };
  return { kind: "unknown format", tone: "warn" };
}

function hostOnly(url: string | undefined): string {
  if (!url) return "—";
  try { return new URL(url).host; } catch { return url; }
}

export default async function SettingsPage() {
  const supabase = await createClient();

  const probes: ProbeResult[] = await Promise.all(
    PROBE_TABLES.map(async (t): Promise<ProbeResult> => {
      const { count, error } = await supabase.from(t).select("*", { count: "exact", head: true });
      if (error) return { table: t, ok: false, count: null, error: error.message };
      return { table: t, ok: true, count: count ?? 0 };
    })
  );

  // Latest timestamps for the three primary write paths
  const [
    { data: lastListing },
    { data: lastSignal },
    { data: lastScore },
    { data: lastOutreach },
  ] = await Promise.all([
    supabase.from("broker_signals").select("first_seen_at").order("first_seen_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("signals").select("observed_at").order("observed_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("scores").select("computed_at").order("computed_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("outreach_log").select("created_at").order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);

  const recentRuns = await getRecentRuns(10);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const keyClass = classifyKey(key);

  const toneColor = (tone: "ok" | "warn" | "err") =>
    tone === "ok" ? "var(--positive)" : tone === "warn" ? "var(--warning)" : "var(--critical)";

  return (
    <div className="bg-grid">
      <PageHeader
        eyebrow="ABA-INTEL · DIAGNOSTICS"
        title="Settings & Connection"
        subtitle="Read-only diagnostic for the current Supabase connection and table state."
        rail={
          <>
            <RailStat label="VERSION" value={pkg.version} />
            <RailStat
              label="KEY"
              value={keyClass.kind.split(" ")[0]}
              tone={keyClass.tone === "ok" ? "positive" : keyClass.tone === "warn" ? "warning" : "critical"}
            />
          </>
        }
      />

      <div className="px-6 py-6 grid grid-cols-2 gap-3">
        {/* Environment */}
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
            <span className="mono text-[10px] tracking-[0.18em]" style={{ color: "var(--text-3)" }}>
              ENVIRONMENT
            </span>
          </div>
          <div className="px-4 py-3 grid grid-cols-3 gap-y-2 gap-x-4 mono text-[11px]">
            <span style={{ color: "var(--text-3)" }}>App version</span>
            <span className="col-span-2 tnum" style={{ color: "var(--text-1)" }}>{pkg.version}</span>

            <span style={{ color: "var(--text-3)" }}>Build commit</span>
            <span className="col-span-2 tnum" style={{ color: "var(--text-1)" }}>
              {process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "dev (no Vercel build)"}
              {process.env.VERCEL_GIT_COMMIT_REF && (
                <span style={{ color: "var(--text-3)" }}> · {process.env.VERCEL_GIT_COMMIT_REF}</span>
              )}
            </span>

            <span style={{ color: "var(--text-3)" }}>Supabase host</span>
            <span className="col-span-2 tnum" style={{ color: "var(--data)" }}>{hostOnly(url)}</span>

            <span style={{ color: "var(--text-3)" }}>Anon key</span>
            <span className="col-span-2" style={{ color: toneColor(keyClass.tone) }}>{keyClass.kind}</span>

            <span style={{ color: "var(--text-3)" }}>Auth proxy</span>
            <span className="col-span-2" style={{ color: "var(--warning)" }}>
              disabled (proxy.ts no-op)
            </span>
          </div>
        </div>

        {/* Pipeline freshness */}
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
            <span className="mono text-[10px] tracking-[0.18em]" style={{ color: "var(--text-3)" }}>
              PIPELINE FRESHNESS
            </span>
          </div>
          <div className="px-4 py-3 grid grid-cols-3 gap-y-2 gap-x-4 mono text-[11px]">
            <span style={{ color: "var(--text-3)" }}>Last broker listing</span>
            <span className="col-span-2 tnum" style={{ color: "var(--text-1)" }}>
              {(lastListing as any)?.first_seen_at ?? "—"}
            </span>

            <span style={{ color: "var(--text-3)" }}>Last L3 signal</span>
            <span className="col-span-2 tnum" style={{ color: "var(--text-1)" }}>
              {(lastSignal as any)?.observed_at ?? "—"}
            </span>

            <span style={{ color: "var(--text-3)" }}>Last score</span>
            <span className="col-span-2 tnum" style={{ color: "var(--text-1)" }}>
              {(lastScore as any)?.computed_at ?? "—"}
            </span>

            <span style={{ color: "var(--text-3)" }}>Last outreach</span>
            <span className="col-span-2 tnum" style={{ color: "var(--text-1)" }}>
              {(lastOutreach as any)?.created_at ?? "—"}
            </span>
          </div>
        </div>
      </div>

      {/* Recent scraper runs */}
      <div className="px-6 pb-6">
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border)" }}>
            <span className="mono text-[10px] tracking-[0.18em]" style={{ color: "var(--text-3)" }}>
              RECENT SCRAPER RUNS
            </span>
            <span className="mono text-[9px] tracking-[0.15em]" style={{ color: "var(--text-3)" }}>
              latest 10 · POST /api/scrapers/run
            </span>
          </div>
          <table className="w-full text-[11.5px] mono">
            <thead>
              <tr style={{ background: "var(--bg-surface)" }}>
                {["WHEN", "SCRAPER", "STATUS", "DURATION", "SEEN", "INSERTED", "UPDATED", "ERROR"].map((h) => (
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
              {recentRuns.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center mono text-[10.5px]" style={{ color: "var(--text-3)" }}>
                    No runs recorded yet. Wire OpenClaw to{" "}
                    <span style={{ color: "var(--data)" }}>POST /api/scrapers/run</span>.
                  </td>
                </tr>
              )}
              {recentRuns.map((r, i) => {
                const statusColor =
                  r.status === "ok" ? "var(--positive)" :
                  r.status === "running" ? "var(--data)" :
                  r.status === "partial" ? "var(--warning)" :
                  "var(--critical)";
                return (
                  <tr key={`${r.scraper_key}-${r.started_at}-${i}`} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                    <td className="px-3 py-2.5" style={{ color: "var(--text-3)" }}>
                      {new Date(r.started_at).toISOString().slice(0, 19).replace("T", " ")}
                    </td>
                    <td className="px-3 py-2.5 tracking-[0.1em]" style={{ color: "var(--text-1)" }}>
                      {r.scraper_key}
                    </td>
                    <td className="px-3 py-2.5 tracking-[0.12em] uppercase" style={{ color: statusColor }}>
                      {r.status}
                    </td>
                    <td className="px-3 py-2.5 tnum" style={{ color: "var(--text-2)" }}>
                      {r.duration_ms != null ? `${(r.duration_ms / 1000).toFixed(1)}s` : "—"}
                    </td>
                    <td className="px-3 py-2.5 tnum" style={{ color: "var(--text-2)" }}>
                      {r.listings_seen ?? "—"}
                    </td>
                    <td className="px-3 py-2.5 tnum" style={{ color: "var(--text-1)" }}>
                      {r.listings_inserted ?? "—"}
                    </td>
                    <td className="px-3 py-2.5 tnum" style={{ color: "var(--text-2)" }}>
                      {r.listings_updated ?? "—"}
                    </td>
                    <td className="px-3 py-2.5 truncate max-w-md" style={{ color: "var(--critical)" }}>
                      {r.error_message || ""}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Table probes */}
      <div className="px-6 pb-6">
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border)" }}>
            <span className="mono text-[10px] tracking-[0.18em]" style={{ color: "var(--text-3)" }}>
              TABLE PROBES
            </span>
            <span className="mono text-[9px] tracking-[0.15em]" style={{ color: "var(--text-3)" }}>
              HEAD count via anon key
            </span>
          </div>
          <table className="w-full text-[11.5px] mono">
            <thead>
              <tr style={{ background: "var(--bg-surface)" }}>
                {["TABLE", "STATUS", "ROWS", "ERROR"].map((h) => (
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
              {probes.map((p) => (
                <tr key={p.table} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  <td className="px-3 py-2.5" style={{ color: "var(--text-1)" }}>{p.table}</td>
                  <td className="px-3 py-2.5" style={{ color: p.ok ? "var(--positive)" : "var(--critical)" }}>
                    {p.ok ? "OK" : "ERROR"}
                  </td>
                  <td className="px-3 py-2.5 tnum" style={{ color: "var(--text-2)" }}>
                    {p.count == null ? "—" : p.count.toLocaleString()}
                  </td>
                  <td className="px-3 py-2.5 truncate max-w-md" style={{ color: "var(--text-3)" }}>
                    {p.error || ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
