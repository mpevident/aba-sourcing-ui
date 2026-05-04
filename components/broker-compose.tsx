"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const SELECT_STYLE: React.CSSProperties = {
  background: "var(--bg-card)",
  border: "1px solid var(--border)",
  color: "var(--text-1)",
};

export function BrokerCompose() {
  const router = useRouter();
  const supabase = createClient();
  const [open, setOpen] = useState(false);

  const [name, setName] = useState("");
  const [firm, setFirm] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [notes, setNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setName(""); setFirm(""); setEmail(""); setPhone(""); setLinkedinUrl(""); setNotes("");
    setError(null);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) { setError("Broker name is required."); return; }
    setSubmitting(true);
    const row: Record<string, unknown> = {
      name: name.trim(),
      firm: firm.trim() || null,
      email: email.trim() || null,
      phone: phone.trim() || null,
      linkedin_url: linkedinUrl.trim() || null,
      notes: notes.trim() || null,
    };
    const { error: err } = await supabase.from("brokers").insert(row);
    setSubmitting(false);
    if (err) {
      setError(err.message);
      return;
    }
    reset();
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <div className="mb-6">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mono text-[10px] tracking-[0.15em] px-3 py-2"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            color: "var(--data)",
          }}
        >
          + ADD BROKER
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mb-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
      <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border)" }}>
        <span className="mono text-[10px] tracking-[0.18em]" style={{ color: "var(--text-3)" }}>
          NEW BROKER
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
          <label className="mono text-[9px] tracking-[0.18em]" style={{ color: "var(--text-3)" }}>NAME *</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full mt-1 px-3 py-2 text-[12px] outline-none mono"
            style={SELECT_STYLE}
            autoFocus
          />
        </div>
        <div className="col-span-12 md:col-span-4">
          <label className="mono text-[9px] tracking-[0.18em]" style={{ color: "var(--text-3)" }}>FIRM</label>
          <input
            value={firm}
            onChange={(e) => setFirm(e.target.value)}
            className="w-full mt-1 px-3 py-2 text-[12px] outline-none mono"
            style={SELECT_STYLE}
          />
        </div>
        <div className="col-span-12 md:col-span-4">
          <label className="mono text-[9px] tracking-[0.18em]" style={{ color: "var(--text-3)" }}>EMAIL</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full mt-1 px-3 py-2 text-[12px] outline-none mono"
            style={SELECT_STYLE}
          />
        </div>
        <div className="col-span-12 md:col-span-4">
          <label className="mono text-[9px] tracking-[0.18em]" style={{ color: "var(--text-3)" }}>PHONE</label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full mt-1 px-3 py-2 text-[12px] outline-none mono"
            style={SELECT_STYLE}
          />
        </div>
        <div className="col-span-12 md:col-span-8">
          <label className="mono text-[9px] tracking-[0.18em]" style={{ color: "var(--text-3)" }}>LINKEDIN URL</label>
          <input
            type="url"
            value={linkedinUrl}
            onChange={(e) => setLinkedinUrl(e.target.value)}
            placeholder="https://linkedin.com/in/…"
            className="w-full mt-1 px-3 py-2 text-[12px] outline-none mono"
            style={SELECT_STYLE}
          />
        </div>
        <div className="col-span-12">
          <label className="mono text-[9px] tracking-[0.18em]" style={{ color: "var(--text-3)" }}>NOTES</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full mt-1 px-3 py-2 text-[12px] outline-none mono resize-y"
            style={SELECT_STYLE}
          />
        </div>

        {error && (
          <div className="col-span-12 mono text-[10.5px]" style={{ color: "var(--critical)" }}>
            {error}
          </div>
        )}

        <div className="col-span-12 flex items-center justify-end gap-2">
          <button
            type="submit"
            disabled={submitting || !name.trim()}
            className="mono text-[10px] tracking-[0.15em] px-3 py-2 disabled:opacity-50"
            style={{
              background: "var(--bg-base)",
              border: "1px solid var(--border-bright)",
              color: "var(--data)",
            }}
          >
            {submitting ? "SAVING…" : "SAVE BROKER"}
          </button>
        </div>
      </div>
    </form>
  );
}
