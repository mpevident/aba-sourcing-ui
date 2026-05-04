"use client";
import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Hit {
  id: string;
  name: string | null;
  state: string | null;
}

export interface PickedPractice {
  id: string;
  name: string;
  state: string | null;
}

interface Props {
  value: PickedPractice | null;
  onChange: (p: PickedPractice | null) => void;
  placeholder?: string;
}

export function PracticePicker({ value, onChange, placeholder = "Pick a practice…" }: Props) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    if (q.trim().length < 2) {
      setHits([]);
      return;
    }
    const handle = setTimeout(async () => {
      setLoading(true);
      const cleaned = q.trim().replace(/,/g, " ");
      const orExpr = `name.ilike.%${cleaned}%,owner_name.ilike.%${cleaned}%,npi.ilike.%${cleaned}%`;
      const broad = await supabase
        .from("practices")
        .select("id, name, state")
        .or(orExpr)
        .order("name", { ascending: true })
        .limit(8);
      let data = broad.data;
      if (broad.error) {
        const narrow = await supabase
          .from("practices")
          .select("id, name, state")
          .ilike("name", `%${q.trim()}%`)
          .order("name", { ascending: true })
          .limit(8);
        data = narrow.data;
      }
      setHits((data as Hit[]) || []);
      setLoading(false);
    }, 220);
    return () => clearTimeout(handle);
  }, [q]);

  if (value) {
    return (
      <div
        className="flex items-center justify-between px-3 py-2 mono text-[11px]"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[12px] truncate" style={{ color: "var(--text-1)" }}>{value.name}</span>
          {value.state && (
            <span className="tracking-[0.12em]" style={{ color: "var(--data)" }}>{value.state}</span>
          )}
        </div>
        <button
          type="button"
          onClick={() => onChange(null)}
          className="shrink-0 hover:opacity-80"
          style={{ color: "var(--text-3)" }}
          aria-label="Clear practice"
        >
          <X size={12} />
        </button>
      </div>
    );
  }

  return (
    <div ref={wrapperRef} className="relative">
      <div
        className="flex items-center gap-2 px-3 py-2"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
      >
        <Search size={12} style={{ color: "var(--text-3)" }} />
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-[12px] outline-none mono"
          style={{ color: "var(--text-1)" }}
          autoComplete="off"
          spellCheck={false}
        />
      </div>
      {open && q.trim().length >= 2 && (
        <div
          className="absolute left-0 right-0 mt-1 z-30 max-h-[260px] overflow-auto"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        >
          {loading && (
            <div className="px-3 py-2 mono text-[10px]" style={{ color: "var(--text-3)" }}>
              SEARCHING…
            </div>
          )}
          {!loading && hits.length === 0 && (
            <div className="px-3 py-3 mono text-[10px]" style={{ color: "var(--text-3)" }}>
              No matches.
            </div>
          )}
          {hits.map((h) => (
            <button
              key={h.id}
              type="button"
              onClick={() => {
                onChange({ id: h.id, name: h.name || "—", state: h.state ?? null });
                setQ("");
                setOpen(false);
              }}
              className="w-full flex items-center justify-between px-3 py-2 hover:bg-white/[0.03] text-left"
              style={{ borderBottom: "1px solid var(--border-subtle)" }}
            >
              <span className="text-[12px]" style={{ color: "var(--text-1)" }}>{h.name || "—"}</span>
              {h.state && (
                <span className="mono text-[10px] tracking-[0.12em]" style={{ color: "var(--data)" }}>
                  {h.state}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
