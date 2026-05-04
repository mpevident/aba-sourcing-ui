import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/digest
 *
 * Stable JSON contract for the daily 7am Central Telegram digest (per the
 * master spec, Phase 1). OpenClaw's cron hits this, formats the result, and
 * forwards to the Telegram channel.
 *
 * Auth: anon key with RLS — same access surface as the dashboard pages, so
 * any RLS-permitted reader can hit it. If we tighten later (require a shared
 * secret), the engine can pass it in and we'll validate.
 *
 * Output:
 *   {
 *     schema_version: 1,
 *     window_hours: 24,
 *     generated_at: ISO,
 *     new_listings:    [...],   // top 10 by score from last 24h, midwest-first
 *     high_fit_today:  [...],   // up to 10 with score >= 70 first seen today
 *     high_weight_signals: [...] // top 10 weighted Layer 3 signals last 24h
 *   }
 */

const MIDWEST = ["IL", "OH", "MI", "IN", "WI", "MN", "IA", "MO", "KS", "NE", "KY", "ND", "SD"];

type DigestListing = {
  id: string;
  practice_id: string | null;
  listing_title: string | null;
  listing_url: string | null;
  source_site: string | null;
  location_state: string | null;
  location_city: string | null;
  score: number | null;
  asking_price: number | null;
  revenue_claimed: number | null;
  first_seen_at: string | null;
  status: string | null;
  is_midwest: boolean;
};

type DigestSignal = {
  id: string;
  practice_id: string | null;
  practice_name: string | null;
  practice_state: string | null;
  signal_type: string | null;
  weight: number | null;
  source: string | null;
  summary: string | null;
  observed_at: string | null;
};

export async function GET() {
  const supabase = await createClient();
  const sinceISO = new Date(Date.now() - 24 * 3_600_000).toISOString(); // 24h ago

  const [{ data: rawListings }, { data: rawSignals }, { data: highFitToday }] = await Promise.all([
    supabase
      .from("broker_signals")
      .select("id, practice_id, listing_title, listing_url, source_site, location_state, location_city, score, asking_price, revenue_claimed, first_seen_at, status")
      .gte("first_seen_at", sinceISO)
      .order("score", { ascending: false, nullsFirst: false })
      .limit(50),
    supabase
      .from("signals")
      .select("id, practice_id, signal_type, weight, source, summary, observed_at, practices(name, state)")
      .gte("observed_at", sinceISO)
      .not("weight", "is", null)
      .order("weight", { ascending: false })
      .limit(20),
    supabase
      .from("broker_signals")
      .select("id, practice_id, listing_title, listing_url, source_site, location_state, location_city, score, asking_price, revenue_claimed, first_seen_at, status")
      .gte("first_seen_at", sinceISO)
      .gte("score", 70)
      .order("score", { ascending: false })
      .limit(10),
  ]);

  // Sort listings: midwest first (within each, by score desc).
  const listings: DigestListing[] = ((rawListings as any[] | null) || []).map((r) => ({
    id: r.id,
    practice_id: r.practice_id ?? null,
    listing_title: r.listing_title ?? null,
    listing_url: r.listing_url ?? null,
    source_site: r.source_site ?? null,
    location_state: r.location_state ?? null,
    location_city: r.location_city ?? null,
    score: r.score ?? null,
    asking_price: r.asking_price ?? null,
    revenue_claimed: r.revenue_claimed ?? null,
    first_seen_at: r.first_seen_at ?? null,
    status: r.status ?? null,
    is_midwest: r.location_state ? MIDWEST.includes(r.location_state) : false,
  }));
  const newListings = [
    ...listings.filter((l) => l.is_midwest),
    ...listings.filter((l) => !l.is_midwest),
  ].slice(0, 10);

  const highWeightSignals: DigestSignal[] = ((rawSignals as any[] | null) || [])
    .slice(0, 10)
    .map((s) => ({
      id: s.id,
      practice_id: s.practice_id ?? null,
      practice_name: s.practices?.name ?? null,
      practice_state: s.practices?.state ?? null,
      signal_type: s.signal_type ?? null,
      weight: s.weight ?? null,
      source: s.source ?? null,
      summary: s.summary ?? null,
      observed_at: s.observed_at ?? null,
    }));

  return NextResponse.json(
    {
      schema_version: 1,
      window_hours: 24,
      generated_at: new Date().toISOString(),
      new_listings: newListings,
      high_fit_today: ((highFitToday as DigestListing[] | null) || []).map((r: any) => ({
        id: r.id,
        practice_id: r.practice_id ?? null,
        listing_title: r.listing_title ?? null,
        listing_url: r.listing_url ?? null,
        source_site: r.source_site ?? null,
        location_state: r.location_state ?? null,
        location_city: r.location_city ?? null,
        score: r.score ?? null,
        asking_price: r.asking_price ?? null,
        revenue_claimed: r.revenue_claimed ?? null,
        first_seen_at: r.first_seen_at ?? null,
        status: r.status ?? null,
      })),
      high_weight_signals: highWeightSignals,
    },
    { headers: { "cache-control": "no-store" } }
  );
}
