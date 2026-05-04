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

export type ScraperRow = {
  key: string;
  lastSeen: Date | null;
  tier: ScraperTier;
  label: "ARMED" | "STALE" | "OFFLINE";
  reason: string;
};

export function classify(lastSeen: Date | null): Pick<ScraperRow, "tier" | "label" | "reason"> {
  if (!lastSeen) return { tier: "err", label: "OFFLINE", reason: "no listings ever ingested" };
  const ageH = (Date.now() - lastSeen.getTime()) / 3_600_000;
  if (ageH < FRESH_HOURS) return { tier: "ok", label: "ARMED", reason: `last ingest ${ageH.toFixed(1)}h ago` };
  if (ageH < STALE_HOURS) return { tier: "warn", label: "STALE", reason: `last ingest ${(ageH / 24).toFixed(1)}d ago` };
  return { tier: "err", label: "OFFLINE", reason: `last ingest ${(ageH / 24).toFixed(0)}d ago` };
}

export async function getScraperRows(): Promise<ScraperRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("broker_signals")
    .select("source_site, first_seen_at")
    .not("source_site", "is", null)
    .not("first_seen_at", "is", null)
    .order("first_seen_at", { ascending: false });

  const lastSeenBySite: Record<string, Date> = {};
  for (const r of data || []) {
    if (!r.source_site || !r.first_seen_at) continue;
    if (!lastSeenBySite[r.source_site]) lastSeenBySite[r.source_site] = new Date(r.first_seen_at);
  }

  return SCRAPERS.map((key) => {
    const lastSeen = lastSeenBySite[key] || null;
    return { key, lastSeen, ...classify(lastSeen) };
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
