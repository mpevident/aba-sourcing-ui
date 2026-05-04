import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/health
 *
 * Liveness + database connectivity ping. Used by the OpenClaw watchdog and
 * any uptime monitor. Cheap: a single HEAD count on broker_signals.
 *
 * Returns 200 when the dashboard process is up AND can reach Supabase.
 * Returns 503 when the DB query errors. The watchdog should treat 503 as
 * "Supabase issue, not the dashboard process."
 */
export async function GET() {
  const startedAt = Date.now();
  const supabase = await createClient();
  const { error, count } = await supabase
    .from("broker_signals")
    .select("*", { count: "exact", head: true });

  const durationMs = Date.now() - startedAt;

  if (error) {
    return NextResponse.json(
      {
        ok: false,
        reason: "supabase query failed",
        message: error.message,
        duration_ms: durationMs,
      },
      { status: 503 }
    );
  }

  return NextResponse.json(
    {
      ok: true,
      checked_at: new Date().toISOString(),
      duration_ms: durationMs,
      broker_signals_count: count ?? 0,
    },
    { headers: { "cache-control": "no-store" } }
  );
}
