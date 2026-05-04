import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/scrapers/run
 *
 * Auth: shared-secret header. Caller sends X-Scraper-Secret matching
 * SCRAPER_INGEST_SECRET. 401 on mismatch, 503 if unset.
 *
 * Body:
 *   {
 *     run_id?:            string,           // idempotency key; omit for anonymous insert
 *     scraper_key:        string,           // required (e.g. "bizbuysell")
 *     status:             "running" | "ok" | "error" | "partial",
 *     listings_seen?:     number,
 *     listings_inserted?: number,
 *     listings_updated?:  number,
 *     error_message?:     string,
 *     meta?:              unknown,          // free-form JSON
 *     started_at?:        ISO date,         // defaults to now() server-side
 *     finished_at?:       ISO date
 *   }
 *
 * Behavior:
 *   - If run_id is present, upserts on (scraper_key, run_id). Use this to send
 *     "running" at start and "ok"/"error"/"partial" at finish — the same row
 *     is updated.
 *   - If run_id is omitted, inserts a fresh row.
 *   - If both timestamps present, computes duration_ms.
 *
 * Returns: { ok, action: "upserted" | "inserted", id }
 */

const VALID_STATUS: ReadonlySet<string> = new Set(["running", "ok", "error", "partial"]);

type Body = {
  run_id?: string;
  scraper_key: string;
  status: "running" | "ok" | "error" | "partial";
  listings_seen?: number;
  listings_inserted?: number;
  listings_updated?: number;
  error_message?: string;
  meta?: unknown;
  started_at?: string;
  finished_at?: string;
};

function badRequest(reason: string) {
  return NextResponse.json({ ok: false, reason }, { status: 400 });
}

function isValid(body: unknown): body is Body {
  if (!body || typeof body !== "object") return false;
  const b = body as Record<string, unknown>;
  if (typeof b.scraper_key !== "string" || !b.scraper_key) return false;
  if (typeof b.status !== "string" || !VALID_STATUS.has(b.status)) return false;
  if (b.run_id != null && typeof b.run_id !== "string") return false;
  for (const k of ["listings_seen", "listings_inserted", "listings_updated"] as const) {
    if (b[k] != null && typeof b[k] !== "number") return false;
  }
  if (b.error_message != null && typeof b.error_message !== "string") return false;
  if (b.started_at != null && (typeof b.started_at !== "string" || isNaN(Date.parse(b.started_at)))) return false;
  if (b.finished_at != null && (typeof b.finished_at !== "string" || isNaN(Date.parse(b.finished_at)))) return false;
  return true;
}

export async function POST(req: Request) {
  const expected = process.env.SCRAPER_INGEST_SECRET;
  if (!expected) {
    return NextResponse.json(
      { ok: false, reason: "SCRAPER_INGEST_SECRET not configured" },
      { status: 503 }
    );
  }
  const provided = req.headers.get("x-scraper-secret");
  if (provided !== expected) {
    return NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 401 });
  }

  let parsed: unknown;
  try {
    parsed = await req.json();
  } catch {
    return badRequest("invalid JSON");
  }
  if (!isValid(parsed)) return badRequest("payload missing required fields (scraper_key, status)");

  const body = parsed;
  const duration_ms =
    body.started_at && body.finished_at
      ? Date.parse(body.finished_at) - Date.parse(body.started_at)
      : undefined;

  const row: Record<string, unknown> = {
    scraper_key: body.scraper_key,
    status: body.status,
    listings_seen: body.listings_seen ?? null,
    listings_inserted: body.listings_inserted ?? null,
    listings_updated: body.listings_updated ?? null,
    error_message: body.error_message ?? null,
    meta: body.meta ?? null,
  };
  if (body.started_at) row.started_at = body.started_at;
  if (body.finished_at) row.finished_at = body.finished_at;
  if (duration_ms != null) row.duration_ms = duration_ms;
  if (body.run_id) row.run_id = body.run_id;

  const supabase = createAdminClient();

  if (body.run_id) {
    const { data, error } = await supabase
      .from("scraper_runs")
      .upsert(row, { onConflict: "scraper_key,run_id" })
      .select("id")
      .maybeSingle();
    if (error) {
      return NextResponse.json({ ok: false, reason: error.message }, { status: 500 });
    }
    return NextResponse.json({
      ok: true,
      action: "upserted",
      id: (data as { id: string } | null)?.id ?? null,
    });
  }

  const { data, error } = await supabase
    .from("scraper_runs")
    .insert(row)
    .select("id")
    .maybeSingle();
  if (error) {
    return NextResponse.json({ ok: false, reason: error.message }, { status: 500 });
  }
  return NextResponse.json({
    ok: true,
    action: "inserted",
    id: (data as { id: string } | null)?.id ?? null,
  });
}
