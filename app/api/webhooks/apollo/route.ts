import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Apollo outreach webhook receiver.
 *
 * Auth: shared-secret header. Apollo must send X-Apollo-Secret matching
 * APOLLO_WEBHOOK_SECRET env var. Without that header (or with a wrong value)
 * we 401.
 *
 * Body shape (kept generic — Apollo's payload shape can vary by event type
 * and version; the engine that posts here is responsible for normalizing):
 *
 *   {
 *     event:           "sent" | "replied" | "bounced" | "opened",
 *     outreach_id?:    string (uuid)        // preferred match
 *     recipient_email?: string               // fallback match
 *     occurred_at:     string (ISO date),
 *     raw?:            unknown               // original Apollo payload
 *   }
 *
 * Behavior:
 *   - Match an existing outreach_log row by id (preferred) or recent email.
 *   - Update status + sent_at / replied_at as appropriate for the event.
 *   - If no match found, insert a new orphan outreach_log row so the event
 *     isn't lost; practice_id stays null.
 */

type ApolloEvent = "sent" | "replied" | "bounced" | "opened";

type ApolloPayload = {
  event: ApolloEvent;
  outreach_id?: string;
  recipient_email?: string;
  occurred_at: string;
  raw?: unknown;
};

const VALID_EVENTS: ReadonlySet<ApolloEvent> = new Set(["sent", "replied", "bounced", "opened"]);

function badRequest(reason: string) {
  return NextResponse.json({ ok: false, reason }, { status: 400 });
}

function isValidPayload(body: unknown): body is ApolloPayload {
  if (!body || typeof body !== "object") return false;
  const b = body as Record<string, unknown>;
  if (typeof b.event !== "string" || !VALID_EVENTS.has(b.event as ApolloEvent)) return false;
  if (typeof b.occurred_at !== "string" || isNaN(Date.parse(b.occurred_at))) return false;
  if (b.outreach_id != null && typeof b.outreach_id !== "string") return false;
  if (b.recipient_email != null && typeof b.recipient_email !== "string") return false;
  return true;
}

export async function POST(req: Request) {
  // Auth via shared secret
  const expected = process.env.APOLLO_WEBHOOK_SECRET;
  if (!expected) {
    return NextResponse.json(
      { ok: false, reason: "APOLLO_WEBHOOK_SECRET not configured" },
      { status: 503 }
    );
  }
  const provided = req.headers.get("x-apollo-secret");
  if (provided !== expected) {
    return NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 401 });
  }

  // Parse + validate body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest("invalid JSON");
  }
  if (!isValidPayload(body)) {
    return badRequest("payload missing required fields (event, occurred_at)");
  }
  const { event, outreach_id, recipient_email, occurred_at, raw } = body;

  if (!outreach_id && !recipient_email) {
    return badRequest("must provide outreach_id or recipient_email");
  }

  const supabase = createAdminClient();

  // Find an existing row.
  let existing: { id: string } | null = null;
  if (outreach_id) {
    const { data } = await supabase
      .from("outreach_log")
      .select("id")
      .eq("id", outreach_id)
      .maybeSingle();
    existing = (data as { id: string } | null) ?? null;
  }
  if (!existing && recipient_email) {
    // Last 60 days of outreach to that recipient — pick most recent.
    const sixtyDaysAgoISO = new Date(Date.now() - 60 * 86_400_000).toISOString();
    const { data } = await supabase
      .from("outreach_log")
      .select("id")
      .eq("recipient_email", recipient_email)
      .gte("created_at", sixtyDaysAgoISO)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    existing = (data as { id: string } | null) ?? null;
  }

  // Build the patch for the matching event.
  const patch: Record<string, unknown> = { status: event };
  if (event === "sent") patch.sent_at = occurred_at;
  if (event === "replied") patch.replied_at = occurred_at;
  if (raw !== undefined) patch.apollo_raw = raw;

  if (existing) {
    const { error } = await supabase
      .from("outreach_log")
      .update(patch)
      .eq("id", existing.id);
    if (error) {
      return NextResponse.json({ ok: false, reason: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, action: "updated", outreach_id: existing.id });
  }

  // No match — log an orphan row so the event isn't lost. practice_id stays null.
  const insertRow: Record<string, unknown> = {
    practice_id: null,
    outreach_type: "email",
    status: event,
    recipient_email: recipient_email ?? null,
    body: "Auto-logged from Apollo webhook (no matching outreach row found).",
  };
  if (event === "sent") insertRow.sent_at = occurred_at;
  if (event === "replied") insertRow.replied_at = occurred_at;
  if (raw !== undefined) insertRow.apollo_raw = raw;

  const { data: inserted, error: insertErr } = await supabase
    .from("outreach_log")
    .insert(insertRow)
    .select("id")
    .maybeSingle();

  if (insertErr) {
    return NextResponse.json({ ok: false, reason: insertErr.message }, { status: 500 });
  }
  return NextResponse.json({
    ok: true,
    action: "inserted_orphan",
    outreach_id: (inserted as { id: string } | null)?.id ?? null,
  });
}
