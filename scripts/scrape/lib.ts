/**
 * Shared helpers for the scrape orchestrator.
 *
 * These run in Node.js (not in the Next.js app process). They mirror what the
 * production OpenClaw harness on Jarvis would do, so the same scaffolding can
 * be hosted there later or run ad-hoc from a workstation.
 *
 * Required env (in .env.local or shell):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY     # bypasses RLS — server-only
 *   SCRAPER_INGEST_SECRET         # for /api/scrapers/run telemetry
 *   APIFY_API_TOKEN               # required if using runApifyActor
 *
 * Optional env:
 *   UI_BASE_URL                   # default http://localhost:3000
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type SourceKey = "bizbuysell" | "bizquest" | "dealstream" | "businessesforsale" | "bizben";

export const SOURCE_KEYS: ReadonlyArray<SourceKey> = [
  "bizbuysell",
  "bizquest",
  "dealstream",
  "businessesforsale",
  "bizben",
];

/** Public broker_signals shape — keep in sync with the table. */
export interface BrokerSignalInsert {
  source_site: SourceKey;
  listing_url: string;
  listing_title: string | null;
  asking_price?: number | null;
  revenue_claimed?: number | null;
  location_city?: string | null;
  location_state?: string | null;
  cst_fit?: boolean | null;
  status?: string | null;
  /** ISO; defaults to now() server-side if omitted. */
  first_seen_at?: string;
}

let _supabase: SupabaseClient | null = null;
export function adminSupabase(): SupabaseClient {
  if (_supabase) return _supabase;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("scrape/lib: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY required");
  }
  _supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _supabase;
}

/**
 * Upsert broker listings on (source_site, listing_url).
 *
 * Returns counts the orchestrator reports back to /api/scrapers/run so the
 * dashboard's ScraperHealth panel reflects real metrics.
 */
export async function upsertListings(
  rows: BrokerSignalInsert[]
): Promise<{ inserted: number; updated: number; seen: number }> {
  if (rows.length === 0) return { inserted: 0, updated: 0, seen: 0 };
  const sb = adminSupabase();

  // Check which URLs already exist so we can split insert vs update counts.
  const urls = rows.map((r) => r.listing_url);
  const { data: existing } = await sb
    .from("broker_signals")
    .select("listing_url")
    .in("listing_url", urls);
  const existingSet = new Set((existing || []).map((r: { listing_url: string }) => r.listing_url));

  const { error } = await sb
    .from("broker_signals")
    .upsert(rows, { onConflict: "source_site,listing_url" });
  if (error) throw new Error(`upsert failed: ${error.message}`);

  const updated = rows.filter((r) => existingSet.has(r.listing_url)).length;
  return {
    inserted: rows.length - updated,
    updated,
    seen: rows.length,
  };
}

/**
 * Report a scraper run to /api/scrapers/run. Same row is upserted on
 * (scraper_key, run_id) so start + finish update one row.
 */
export async function reportRun(payload: {
  scraper_key: SourceKey;
  run_id: string;
  status: "running" | "ok" | "error" | "partial";
  started_at?: string;
  finished_at?: string;
  listings_seen?: number;
  listings_inserted?: number;
  listings_updated?: number;
  error_message?: string;
  meta?: Record<string, unknown>;
}): Promise<void> {
  const base = process.env.UI_BASE_URL || "http://localhost:3000";
  const secret = process.env.SCRAPER_INGEST_SECRET;
  if (!secret) {
    console.warn("[scrape/lib] SCRAPER_INGEST_SECRET unset — skipping telemetry");
    return;
  }
  const res = await fetch(`${base}/api/scrapers/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-scraper-secret": secret },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.warn(`[scrape/lib] /api/scrapers/run ${res.status}: ${body.slice(0, 200)}`);
  }
}

/** Filter to ABA-relevant listings. Conservative — false positives are
 *  cheaper than false negatives at the universe-build phase. */
const ABA_KEYWORDS = [
  /\baba\b/i,
  /\bapplied behavior(?:al)? analysis\b/i,
  /\bbehavior(?:al)? (?:health|therapy|analysis)\b/i,
  /\bautism\b/i,
  /\bbcba\b/i,
  /\bdevelopmental disabilit(?:y|ies)\b/i,
];
export function isAbaRelevant(text: string | null | undefined): boolean {
  if (!text) return false;
  return ABA_KEYWORDS.some((re) => re.test(text));
}

/** Parse "$2.4M" / "$340K" / "$50,000" / "$50000" → number. */
export function parseMoney(s: string | null | undefined): number | null {
  if (!s) return null;
  const cleaned = s.replace(/[,\s]/g, "").trim();
  const m = cleaned.match(/^\$?([\d.]+)\s*([KMB])?/i);
  if (!m) return null;
  const n = parseFloat(m[1]);
  if (isNaN(n)) return null;
  const mult = m[2]?.toUpperCase() === "B" ? 1e9 : m[2]?.toUpperCase() === "M" ? 1e6 : m[2]?.toUpperCase() === "K" ? 1e3 : 1;
  return Math.round(n * mult);
}

/** Random-ish run id — caller stamps so start + finish telemetry agree. */
export function makeRunId(prefix: string): string {
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  return `${prefix}-${ts}`;
}
