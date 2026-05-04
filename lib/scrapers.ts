import { createClient } from "@/lib/supabase/server";

export const SCRAPERS = [
  "bizbuysell",
  "bizquest",
  "dealstream",
  "businessesforsale",
  "bizben",
] as const;

export const FRESH_HOURS = 36;
export const STALE_HOURS = 24 * 7;

export type ScraperTier = "ok" | "warn" | "err";
export type ScraperLabel = "ARMED" | "STALE" | "OFFLINE" | "RUNNING" | "STALLED" | "ERROR";
export type ScraperSource = "run" | "inferred" | "none";

export type ScraperRow = {
  key: string;
  lastSeen: Date | null;
  tier: ScraperTier;
  label: ScraperLabel;
  reason: string;
  /** Whether the row was classified from a real scraper_runs entry, an
   *  inferred broker_signals.first_seen_at fallback, or no data at all. */
  source: ScraperSource;
  /** Optional metrics from the latest run (only set when source === "run"). */
  inserted?: number | null;
  duration_ms?: number | null;
};

export type RunRow = {
  scraper_key: string;
  status: "running" | "ok" | "error" | "partial";
  started_at: string;
  finished_at: string | null;
  duration_ms: number | null;
  listings_seen: number | null;
  listings_inserted: number | null;
  listings_updated: number | null;
  error_message: string | null;
};

// Legacy fallback: classify based on the most recent broker_signals.first_seen_at
// for that source. Used only when scraper_runs has nothing for this scraper —
// e.g. before OpenClaw is reporting.
function classifyFromInferred(lastSeen: Date | null): Pick<ScraperRow, "tier" | "label" | "reason"> {
  if (!lastSeen) return { tier: "err", label: "OFFLINE", reason: "no listings ever ingested" };
  const ageH = (Date.now() - lastSeen.getTime()) / 3_600_000;
  if (ageH < FRESH_HOURS) return { tier: "ok", label: "ARMED", reason: `last ingest ${ageH.toFixed(1)}h ago (inferred)` };
  if (ageH < STALE_HOURS) return { tier: "warn", label: "STALE", reason: `last ingest ${(ageH / 24).toFixed(1)}d ago (inferred)` };
  return { tier: "err", label: "OFFLINE", reason: `last ingest ${(ageH / 24).toFixed(0)}d ago (inferred)` };
}

function classifyFromRun(run: RunRow): {
  lastSeen: Date;
  tier: ScraperTier;
  label: ScraperLabel;
  reason: string;
} {
  const startedAt = new Date(run.started_at);
  const finishedAt = run.finished_at ? new Date(run.finished_at) : null;

  if (run.status === "running") {
    const ageH = (Date.now() - startedAt.getTime()) / 3_600_000;
    if (ageH < 1) {
      return { lastSeen: startedAt, tier: "ok", label: "RUNNING", reason: `started ${ageH.toFixed(1)}h ago` };
    }
    return { lastSeen: startedAt, tier: "warn", label: "STALLED", reason: `started ${ageH.toFixed(0)}h ago, never finished` };
  }

  if (run.status === "error") {
    return {
      lastSeen: finishedAt || startedAt,
      tier: "err",
      label: "ERROR",
      reason: run.error_message?.slice(0, 80) || "last run failed",
    };
  }

  // status === 'ok' or 'partial'
  const reference = finishedAt || startedAt;
  const ageH = (Date.now() - reference.getTime()) / 3_600_000;
  const inserted = run.listings_inserted ?? 0;
  const detail = inserted > 0 ? `, ${inserted} new` : "";

  if (ageH < FRESH_HOURS) {
    return { lastSeen: reference, tier: "ok", label: "ARMED", reason: `last run ${ageH.toFixed(1)}h ago${detail}` };
  }
  if (ageH < STALE_HOURS) {
    return { lastSeen: reference, tier: "warn", label: "STALE", reason: `last run ${(ageH / 24).toFixed(1)}d ago${detail}` };
  }
  return { lastSeen: reference, tier: "err", label: "OFFLINE", reason: `last run ${(ageH / 24).toFixed(0)}d ago${detail}` };
}

export async function getScraperRows(): Promise<ScraperRow[]> {
  const supabase = await createClient();

  const [{ data: runRows }, { data: listingRows }] = await Promise.all([
    supabase
      .from("scraper_runs")
      .select("scraper_key, status, started_at, finished_at, duration_ms, listings_seen, listings_inserted, listings_updated, error_message")
      .in("scraper_key", SCRAPERS as unknown as string[])
      .order("started_at", { ascending: false })
      .limit(200),
    supabase
      .from("broker_signals")
      .select("source_site, first_seen_at")
      .not("source_site", "is", null)
      .not("first_seen_at", "is", null)
      .order("first_seen_at", { ascending: false }),
  ]);

  const latestRunByKey: Record<string, RunRow> = {};
  for (const r of (runRows as RunRow[] | null) || []) {
    if (!latestRunByKey[r.scraper_key]) latestRunByKey[r.scraper_key] = r;
  }

  const lastSeenBySite: Record<string, Date> = {};
  for (const r of (listingRows as { source_site: string | null; first_seen_at: string | null }[] | null) || []) {
    if (!r.source_site || !r.first_seen_at) continue;
    if (!lastSeenBySite[r.source_site]) lastSeenBySite[r.source_site] = new Date(r.first_seen_at);
  }

  return SCRAPERS.map((key): ScraperRow => {
    const run = latestRunByKey[key];
    if (run) {
      const { lastSeen, tier, label, reason } = classifyFromRun(run);
      return {
        key,
        lastSeen,
        tier,
        label,
        reason,
        source: "run",
        inserted: run.listings_inserted,
        duration_ms: run.duration_ms,
      };
    }
    const lastSeen = lastSeenBySite[key] || null;
    return {
      key,
      lastSeen,
      ...classifyFromInferred(lastSeen),
      source: lastSeen ? "inferred" : "none",
    };
  });
}

export function summarize(rows: ScraperRow[]) {
  const armed = rows.filter((r) => r.tier === "ok").length;
  const stale = rows.filter((r) => r.tier === "warn").length;
  const offline = rows.filter((r) => r.tier === "err").length;
  const total = rows.length;
  const tier: ScraperTier = offline > 0 ? "err" : stale > 0 ? "warn" : "ok";
  return { armed, stale, offline, total, tier };
}

/** Fetch the most recent N runs across all scrapers — for the /settings panel. */
export async function getRecentRuns(limit = 10): Promise<RunRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("scraper_runs")
    .select("scraper_key, status, started_at, finished_at, duration_ms, listings_seen, listings_inserted, listings_updated, error_message")
    .order("started_at", { ascending: false })
    .limit(limit);
  return (data as RunRow[] | null) || [];
}
