import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/webhooks/email
 *
 * Inbound broker email landing zone (Phase 4 inbox triage). Gmail forwards
 * deals@cstacademy.com here, this writes to inbound_emails, and the classifier
 * (separate process) reads triaged=false rows.
 *
 * Auth: shared-secret header. EMAIL_INGEST_SECRET via X-Email-Secret.
 *
 * Body (caller is responsible for normalizing whichever forwarder is in front):
 *
 *   {
 *     message_id?:   string,    // RFC822 Message-ID for dedup
 *     from_address?: string,
 *     from_name?:    string,
 *     subject?:      string,
 *     body_text?:    string,
 *     body_html?:    string,
 *     received_at?:  ISO date,
 *     raw?:          unknown    // full forwarder payload
 *   }
 *
 * Behavior:
 *   - Dedup on message_id when present (unique index on the column).
 *   - Insert with triaged=false; classifier picks it up later.
 *
 * Returns: { ok, action: "inserted" | "deduped", id }
 */

type Body = {
  message_id?: string;
  from_address?: string;
  from_name?: string;
  subject?: string;
  body_text?: string;
  body_html?: string;
  received_at?: string;
  raw?: unknown;
};

function badRequest(reason: string) {
  return NextResponse.json({ ok: false, reason }, { status: 400 });
}

function isValid(body: unknown): body is Body {
  if (!body || typeof body !== "object") return false;
  const b = body as Record<string, unknown>;
  for (const k of ["message_id", "from_address", "from_name", "subject", "body_text", "body_html"] as const) {
    if (b[k] != null && typeof b[k] !== "string") return false;
  }
  if (b.received_at != null && (typeof b.received_at !== "string" || isNaN(Date.parse(b.received_at)))) {
    return false;
  }
  return true;
}

export async function POST(req: Request) {
  const expected = process.env.EMAIL_INGEST_SECRET;
  if (!expected) {
    return NextResponse.json(
      { ok: false, reason: "EMAIL_INGEST_SECRET not configured" },
      { status: 503 }
    );
  }
  const provided = req.headers.get("x-email-secret");
  if (provided !== expected) {
    return NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 401 });
  }

  let parsed: unknown;
  try {
    parsed = await req.json();
  } catch {
    return badRequest("invalid JSON");
  }
  if (!isValid(parsed)) return badRequest("payload field types invalid");

  const body = parsed;
  const supabase = createAdminClient();

  // Dedup check on message_id when provided.
  if (body.message_id) {
    const { data: existing } = await supabase
      .from("inbound_emails")
      .select("id")
      .eq("message_id", body.message_id)
      .maybeSingle();
    if (existing) {
      return NextResponse.json({
        ok: true,
        action: "deduped",
        id: (existing as { id: string }).id,
      });
    }
  }

  const row: Record<string, unknown> = {
    message_id: body.message_id ?? null,
    from_address: body.from_address ?? null,
    from_name: body.from_name ?? null,
    subject: body.subject ?? null,
    body_text: body.body_text ?? null,
    body_html: body.body_html ?? null,
    raw: body.raw ?? null,
  };
  if (body.received_at) row.received_at = body.received_at;

  const { data, error } = await supabase
    .from("inbound_emails")
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
