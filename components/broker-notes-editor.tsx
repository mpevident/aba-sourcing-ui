"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface Props {
  brokerId: string;
  initialNotes: string | null;
}

export function BrokerNotesEditor({ brokerId, initialNotes }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [notes, setNotes] = useState(initialNotes || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  // Reset local state if the server-rendered initialNotes changes (e.g. realtime).
  useEffect(() => {
    setNotes(initialNotes || "");
  }, [initialNotes]);

  const dirty = notes !== (initialNotes || "");

  async function save() {
    setSaving(true);
    setError(null);
    const { error: err } = await supabase
      .from("brokers")
      .update({ notes: notes || null })
      .eq("id", brokerId);
    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    setSavedAt(Date.now());
    router.refresh();
  }

  // Auto-clear "saved" indicator after 2.5s.
  useEffect(() => {
    if (!savedAt) return;
    const t = setTimeout(() => setSavedAt(null), 2500);
    return () => clearTimeout(t);
  }, [savedAt]);

  return (
    <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
      <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border)" }}>
        <span className="mono text-[10px] tracking-[0.18em]" style={{ color: "var(--text-3)" }}>
          NOTES
        </span>
        <div className="flex items-center gap-2 mono text-[9px] tracking-[0.15em]">
          {error && <span style={{ color: "var(--critical)" }}>{error}</span>}
          {!error && savedAt && <span style={{ color: "var(--positive)" }}>SAVED</span>}
          {!error && !savedAt && dirty && <span style={{ color: "var(--warning)" }}>UNSAVED</span>}
        </div>
      </div>
      <div className="p-4 flex flex-col gap-2">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          placeholder="Notes on this broker — relationship history, deal preferences, side conversations…"
          className="w-full px-3 py-2 text-[12px] outline-none mono resize-y"
          style={{ background: "var(--bg-base)", border: "1px solid var(--border)", color: "var(--text-1)" }}
        />
        <div className="flex items-center justify-end gap-2">
          {dirty && (
            <button
              type="button"
              onClick={() => setNotes(initialNotes || "")}
              className="mono text-[10px] tracking-[0.15em] px-2 py-1"
              style={{ color: "var(--text-3)" }}
            >
              REVERT
            </button>
          )}
          <button
            type="button"
            disabled={saving || !dirty}
            onClick={save}
            className="mono text-[10px] tracking-[0.15em] px-3 py-1.5 disabled:opacity-50"
            style={{
              background: "var(--bg-base)",
              border: "1px solid var(--border-bright)",
              color: dirty ? "var(--data)" : "var(--text-3)",
            }}
          >
            {saving ? "SAVING…" : "SAVE NOTES"}
          </button>
        </div>
      </div>
    </div>
  );
}
