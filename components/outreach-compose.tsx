"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PracticePicker, type PickedPractice } from "./practice-picker";

const OUTREACH_TYPES = ["email", "linkedin", "call", "letter", "other"] as const;
const STATUSES = ["draft", "sent"] as const;

const SELECT_STYLE: React.CSSProperties = {
  background: "var(--bg-card)",
  border: "1px solid var(--border)",
  color: "var(--text-1)",
};

interface OutreachComposeProps {
  /** Pre-fill the practice when arriving from `/practice/[id]`. */
  initialPractice?: PickedPractice | null;
}

export function OutreachCompose({ initialPractice = null }: OutreachComposeProps = {}) {
  const router = useRouter();
  const supabase = createClient();
  // If we got handed an initial practice, open the form straight away.
  const [open, setOpen] = useState(!!initialPractice);

  const [practice, setPractice] = useState<PickedPractice | null>(initialPractice);
  const [type, setType] = useState<typeof OUTREACH_TYPES[number]>("email");
  const [status, setStatus] = useState<typeof STATUSES[number]>("draft");
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [body, setBody] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setPractice(null);
    setType("email");
    setStatus("draft");
    setRecipientName("");
    setRecipientEmail("");
    setBody("");
    setError(null);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!practice) {
      setError("Pick a practice first.");
      return;
    }
    if (status === "sent" && !recipientName && !recipientEmail) {
      setError("'sent' needs at least a recipient name or email.");
      return;
    }
    setSubmitting(true);
    const row: Record<string, unknown> = {
      practice_id: practice.id,
      outreach_type: type,
      status,
      recipient_name: recipientName || null,
      recipient_email: recipientEmail || null,
      body: body || null,
    };
    if (status === "sent") row.sent_at = new Date().toISOString();
    const { error } = await supabase.from("outreach_log").insert(row);
    setSubmitting(false);
    if (error) {
      setError(error.message);
      return;
    }
    reset();
    setOpen(false);
    // Clear ?practice_id= from the URL after a successful save so a manual
    // refresh doesn't re-prefill the form with a stale practice.
    if (typeof window !== "undefined" && window.location.search.includes("practice_id")) {
      router.replace(window.location.pathname);
    }
    router.refresh();
  }

  if (!open) {
    return (
      <div className="mb-6">
        <button
          onClick={() => setOpen(true)}
          className="mono text-[10px] tracking-[0.15em] px-3 py-2"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            color: "var(--data)",
          }}
        >
          + LOG OUTREACH
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mb-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
      <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border)" }}>
        <span className="mono text-[10px] tracking-[0.18em]" style={{ color: "var(--text-3)" }}>
          NEW OUTREACH
        </span>
        <button
          type="button"
          onClick={() => { reset(); setOpen(false); }}
          className="mono text-[10px] tracking-[0.12em]"
          style={{ color: "var(--text-3)" }}
        >
          CANCEL
        </button>
      </div>

      <div className="p-4 grid grid-cols-12 gap-3">
        <div className="col-span-12 md:col-span-4">
          <label className="mono text-[9px] tracking-[0.18em]" style={{ color: "var(--text-3)" }}>
            PRACTICE
          </label>
          <div className="mt-1">
            <PracticePicker value={practice} onChange={setPractice} />
          </div>
        </div>

        <div className="col-span-6 md:col-span-2">
          <label className="mono text-[9px] tracking-[0.18em]" style={{ color: "var(--text-3)" }}>
            TYPE
          </label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as typeof OUTREACH_TYPES[number])}
            className="w-full mt-1 px-3 py-2 text-[12px] outline-none capitalize"
            style={SELECT_STYLE}
          >
            {OUTREACH_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div className="col-span-6 md:col-span-2">
          <label className="mono text-[9px] tracking-[0.18em]" style={{ color: "var(--text-3)" }}>
            STATUS
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as typeof STATUSES[number])}
            className="w-full mt-1 px-3 py-2 text-[12px] outline-none capitalize"
            style={SELECT_STYLE}
          >
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div className="col-span-12 md:col-span-4">
          <label className="mono text-[9px] tracking-[0.18em]" style={{ color: "var(--text-3)" }}>
            RECIPIENT
          </label>
          <div className="mt-1 grid grid-cols-2 gap-2">
            <input
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              placeholder="Name"
              className="px-3 py-2 text-[12px] outline-none mono"
              style={SELECT_STYLE}
            />
            <input
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              placeholder="Email"
              type="email"
              className="px-3 py-2 text-[12px] outline-none mono"
              style={SELECT_STYLE}
            />
          </div>
        </div>

        <div className="col-span-12">
          <label className="mono text-[9px] tracking-[0.18em]" style={{ color: "var(--text-3)" }}>
            NOTES / BODY
          </label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={4}
            className="w-full mt-1 px-3 py-2 text-[12px] outline-none mono resize-y"
            style={SELECT_STYLE}
            placeholder="What you sent / planning to send. Plain text."
          />
        </div>

        {error && (
          <div className="col-span-12 mono text-[10.5px]" style={{ color: "var(--critical)" }}>
            {error}
          </div>
        )}

        <div className="col-span-12 flex items-center justify-end gap-2">
          <span className="mono text-[10px]" style={{ color: "var(--text-3)" }}>
            {status === "sent"
              ? "Will stamp sent_at with the current time."
              : "Saved as draft — no timestamps."}
          </span>
          <button
            type="submit"
            disabled={submitting || !practice}
            className="mono text-[10px] tracking-[0.15em] px-3 py-2 disabled:opacity-50"
            style={{
              background: "var(--bg-base)",
              border: "1px solid var(--border-bright)",
              color: "var(--data)",
            }}
          >
            {submitting ? "SAVING…" : "SAVE OUTREACH"}
          </button>
        </div>
      </div>
    </form>
  );
}
