/**
 * Scrape orchestrator — runs one source (or "all") end-to-end:
 *   1. Reports `running` to /api/scrapers/run
 *   2. Triggers the Apify actor configured for that source
 *   3. Normalizes results → broker_signals rows
 *   4. Filters to ABA-relevant listings
 *   5. Upserts into broker_signals
 *   6. Reports `ok` (or `error`) to /api/scrapers/run
 *
 * Usage:
 *   npm run scrape -- bizbuysell
 *   npm run scrape -- all
 *
 * Required env: see scripts/scrape/lib.ts and scripts/scrape/apify.ts.
 */

import {
  SOURCE_KEYS,
  type SourceKey,
  type BrokerSignalInsert,
  upsertListings,
  reportRun,
  isAbaRelevant,
  parseMoney,
  makeRunId,
} from "./lib";
import { runApifyActor, actorIdForSource } from "./apify";

/**
 * Generic Apify dataset item shape we coerce to. Real actor outputs vary;
 * we lift fields by common names and tolerate missing data with optional
 * chaining.
 */
interface RawItem {
  url?: string;
  link?: string;
  title?: string;
  name?: string;
  price?: string | number | null;
  asking_price?: string | number | null;
  revenue?: string | number | null;
  cash_flow?: string | number | null;
  location?: string;
  city?: string;
  state?: string;
  description?: string;
  body?: string;
}

function pickUrl(item: RawItem): string | null {
  return item.url || item.link || null;
}
function pickTitle(item: RawItem): string | null {
  return item.title || item.name || null;
}
function pickMoney(...vals: Array<string | number | null | undefined>): number | null {
  for (const v of vals) {
    if (v == null) continue;
    if (typeof v === "number") return v;
    const parsed = parseMoney(v);
    if (parsed != null) return parsed;
  }
  return null;
}

function parseLocation(item: RawItem): { city: string | null; state: string | null } {
  if (item.city || item.state) {
    return { city: item.city ?? null, state: item.state ?? null };
  }
  if (item.location) {
    // "Chicago, IL" or "Chicago, IL 60601"
    const m = item.location.match(/^([^,]+),\s*([A-Z]{2})\b/);
    if (m) return { city: m[1].trim(), state: m[2] };
    return { city: item.location.trim(), state: null };
  }
  return { city: null, state: null };
}

function normalize(source: SourceKey, item: RawItem): BrokerSignalInsert | null {
  const url = pickUrl(item);
  const title = pickTitle(item);
  if (!url || !title) return null;

  const text = [title, item.description, item.body].filter(Boolean).join(" ");
  if (!isAbaRelevant(text)) return null;

  const { city, state } = parseLocation(item);
  return {
    source_site: source,
    listing_url: url,
    listing_title: title,
    asking_price: pickMoney(item.asking_price, item.price),
    revenue_claimed: pickMoney(item.revenue, item.cash_flow),
    location_city: city,
    location_state: state,
    cst_fit: null,
    status: "new",
  };
}

/**
 * Default search input for a source. Apify actors typically accept a
 * keywords list and an optional location filter — extend per actor.
 */
function defaultActorInput(source: SourceKey): unknown {
  return {
    source,
    keywords: [
      "ABA",
      "applied behavior analysis",
      "behavioral health",
      "autism therapy",
    ],
    states: ["IL", "OH", "MI", "IN", "WI", "MN", "IA", "MO", "KS", "NE", "KY", "ND", "SD"],
    maxItems: 200,
  };
}

export async function runSource(source: SourceKey): Promise<{
  ok: boolean;
  inserted: number;
  updated: number;
  seen: number;
  durationMs: number;
  reason?: string;
}> {
  const runId = makeRunId(source);
  const startedAt = new Date().toISOString();

  await reportRun({ scraper_key: source, run_id: runId, status: "running", started_at: startedAt });

  const actorId = actorIdForSource(source);
  if (!actorId) {
    const reason = `no Apify actor configured (set ${source.toUpperCase()} env var APIFY_ACTOR_${source.toUpperCase()})`;
    await reportRun({
      scraper_key: source,
      run_id: runId,
      status: "error",
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      error_message: reason,
    });
    return { ok: false, inserted: 0, updated: 0, seen: 0, durationMs: 0, reason };
  }

  try {
    const result = await runApifyActor<RawItem>({
      actorId,
      input: defaultActorInput(source),
    });

    const normalized = result.items
      .map((it) => normalize(source, it))
      .filter((r): r is BrokerSignalInsert => r != null);

    const counts = await upsertListings(normalized);
    const finishedAt = new Date().toISOString();

    await reportRun({
      scraper_key: source,
      run_id: runId,
      status: "ok",
      started_at: startedAt,
      finished_at: finishedAt,
      listings_seen: result.items.length,
      listings_inserted: counts.inserted,
      listings_updated: counts.updated,
      meta: { apify_run_id: result.runId, dataset_id: result.datasetId },
    });

    return {
      ok: true,
      inserted: counts.inserted,
      updated: counts.updated,
      seen: result.items.length,
      durationMs: result.durationMs,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await reportRun({
      scraper_key: source,
      run_id: runId,
      status: "error",
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      error_message: message,
    });
    return { ok: false, inserted: 0, updated: 0, seen: 0, durationMs: 0, reason: message };
  }
}

async function main() {
  const arg = process.argv[2];
  if (!arg) {
    console.error("usage: npm run scrape -- <source|all>");
    console.error(`sources: ${SOURCE_KEYS.join(", ")}`);
    process.exit(2);
  }

  const targets: SourceKey[] = arg === "all"
    ? [...SOURCE_KEYS]
    : SOURCE_KEYS.includes(arg as SourceKey)
      ? [arg as SourceKey]
      : (() => { throw new Error(`unknown source: ${arg}`); })();

  let totalInserted = 0;
  let totalUpdated = 0;
  let totalSeen = 0;
  let failed = 0;

  for (const source of targets) {
    process.stdout.write(`▶ ${source}… `);
    const r = await runSource(source);
    if (r.ok) {
      console.log(`ok · seen=${r.seen} inserted=${r.inserted} updated=${r.updated} (${(r.durationMs / 1000).toFixed(1)}s)`);
    } else {
      console.log(`error · ${r.reason ?? "unknown"}`);
      failed++;
    }
    totalInserted += r.inserted;
    totalUpdated += r.updated;
    totalSeen += r.seen;
  }

  console.log(`\n— sources=${targets.length} ok=${targets.length - failed} err=${failed}`);
  console.log(`  seen=${totalSeen} inserted=${totalInserted} updated=${totalUpdated}`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error("orchestrator failed:", err);
  process.exit(1);
});
