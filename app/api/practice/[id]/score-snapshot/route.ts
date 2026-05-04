import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/practice/[id]/score-snapshot
 *
 * Stable JSON contract for the deal-memo flow (Opus 4.7 / GPT-5.5-pro).
 * Aggregates everything the memo prompt needs into one response so the engine
 * doesn't have to know the page's render shape.
 *
 * Auth: anon key with RLS — same access surface as the dashboard pages.
 * Returns 404 if no practice with that id, 200 otherwise.
 *
 * Stability rules:
 *   - Field names below are part of a public contract. Don't rename them.
 *   - When adding fields, append; never reorder or repurpose existing keys.
 */

type Snapshot = {
  schema_version: 1;
  generated_at: string;
  practice: {
    id: string;
    name: string | null;
    state: string | null;
    city: string | null;
    npi: string | null;
    medicaid_id: string | null;
    sos_entity_id: string | null;
    owner_name: string | null;
    owner_linkedin_url: string | null;
    owner_age_proxy: number | null;
    bcba_count: number | null;
    rbt_count: number | null;
    location_count: number | null;
    services: string[] | string | null;
    founded_year: number | null;
    pe_backed: boolean | null;
    estimated_revenue: number | null;
    status: string | null;
  };
  latest_score: {
    score: number | null;
    rationale: string | null;
    computed_at: string | null;
    scoring_engine: string | null;
  } | null;
  signals: Array<{
    id: string;
    signal_type: string | null;
    weight: number | null;
    source: string | null;
    summary: string | null;
    observed_at: string | null;
    raw_url: string | null;
  }>;
  broker_listings: Array<{
    id: string;
    listing_title: string | null;
    listing_url: string | null;
    source_site: string | null;
    score: number | null;
    asking_price: number | null;
    revenue_claimed: number | null;
    first_seen_at: string | null;
    status: string | null;
  }>;
  outreach: Array<{
    id: string;
    outreach_type: string | null;
    recipient_name: string | null;
    recipient_email: string | null;
    status: string | null;
    sent_at: string | null;
    replied_at: string | null;
    body: string | null;
  }>;
  counts: {
    signals_total: number;
    listings_total: number;
    outreach_total: number;
  };
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const [
    { data: practice },
    { data: latestScore },
    { data: signals },
    { data: listings },
    { data: outreach },
    { count: signalsCount },
    { count: listingsCount },
    { count: outreachCount },
  ] = await Promise.all([
    supabase.from("practices").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("scores")
      .select("score, rationale, computed_at, scoring_engine")
      .eq("practice_id", id)
      .order("computed_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("signals")
      .select("id, signal_type, weight, source, summary, observed_at, raw_url")
      .eq("practice_id", id)
      .order("observed_at", { ascending: false })
      .limit(50),
    supabase
      .from("broker_signals")
      .select("id, listing_title, listing_url, source_site, score, asking_price, revenue_claimed, first_seen_at, status")
      .eq("practice_id", id)
      .order("first_seen_at", { ascending: false })
      .limit(20),
    supabase
      .from("outreach_log")
      .select("id, outreach_type, recipient_name, recipient_email, status, sent_at, replied_at, body")
      .eq("practice_id", id)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase.from("signals").select("*", { count: "exact", head: true }).eq("practice_id", id),
    supabase.from("broker_signals").select("*", { count: "exact", head: true }).eq("practice_id", id),
    supabase.from("outreach_log").select("*", { count: "exact", head: true }).eq("practice_id", id),
  ]);

  if (!practice) {
    return NextResponse.json({ ok: false, reason: "practice not found" }, { status: 404 });
  }

  const p = practice as any;
  const score = latestScore as any | null;

  const snapshot: Snapshot = {
    schema_version: 1,
    generated_at: new Date().toISOString(),
    practice: {
      id: p.id,
      name: p.name ?? null,
      state: p.state ?? null,
      city: p.city ?? null,
      npi: p.npi ?? null,
      medicaid_id: p.medicaid_id ?? null,
      sos_entity_id: p.sos_entity_id ?? null,
      owner_name: p.owner_name ?? null,
      owner_linkedin_url: p.owner_linkedin_url ?? null,
      owner_age_proxy: p.owner_age_proxy ?? null,
      bcba_count: p.bcba_count ?? null,
      rbt_count: p.rbt_count ?? null,
      location_count: p.location_count ?? null,
      services: p.services ?? null,
      founded_year: p.founded_year ?? null,
      pe_backed: p.pe_backed ?? null,
      estimated_revenue: p.estimated_revenue ?? null,
      status: p.status ?? null,
    },
    latest_score: score
      ? {
          score: score.score ?? null,
          rationale: score.rationale ?? null,
          computed_at: score.computed_at ?? null,
          scoring_engine: score.scoring_engine ?? null,
        }
      : null,
    signals: (signals as any[] | null || []).map((s) => ({
      id: s.id,
      signal_type: s.signal_type ?? null,
      weight: s.weight ?? null,
      source: s.source ?? null,
      summary: s.summary ?? null,
      observed_at: s.observed_at ?? null,
      raw_url: s.raw_url ?? null,
    })),
    broker_listings: (listings as any[] | null || []).map((l) => ({
      id: l.id,
      listing_title: l.listing_title ?? null,
      listing_url: l.listing_url ?? null,
      source_site: l.source_site ?? null,
      score: l.score ?? null,
      asking_price: l.asking_price ?? null,
      revenue_claimed: l.revenue_claimed ?? null,
      first_seen_at: l.first_seen_at ?? null,
      status: l.status ?? null,
    })),
    outreach: (outreach as any[] | null || []).map((o) => ({
      id: o.id,
      outreach_type: o.outreach_type ?? null,
      recipient_name: o.recipient_name ?? null,
      recipient_email: o.recipient_email ?? null,
      status: o.status ?? null,
      sent_at: o.sent_at ?? null,
      replied_at: o.replied_at ?? null,
      body: o.body ?? null,
    })),
    counts: {
      signals_total: signalsCount ?? 0,
      listings_total: listingsCount ?? 0,
      outreach_total: outreachCount ?? 0,
    },
  };

  return NextResponse.json(snapshot, {
    headers: {
      // Caches are downstream of the engine — let it decide.
      "cache-control": "no-store",
    },
  });
}
