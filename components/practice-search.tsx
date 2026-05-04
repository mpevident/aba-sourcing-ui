"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Command, Building2, Tag } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Hit =
  | {
      kind: "practice";
      id: string;
      name: string | null;
      state: string | null;
      owner_name?: string | null;
    }
  | {
      kind: "listing";
      id: string;
      listing_title: string | null;
      location_state: string | null;
      location_city: string | null;
      practice_id: string | null;
      listing_url: string | null;
    };

function escapeForOr(s: string): string {
  // PostgREST `.or()` arg uses commas as separators; commas inside a value
  // would break parsing. Strip them rather than try to quote-escape (simpler,
  // and search queries rarely contain commas anyway).
  return s.replace(/,/g, " ");
}

export function PracticeSearch() {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const supabase = createClient();

  // ⌘K / Ctrl-K focuses the search box.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      } else if (e.key === "Escape") {
        setOpen(false);
        inputRef.current?.blur();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Click-outside to close.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // Debounced parallel search across practices + broker_signals.
  useEffect(() => {
    if (q.trim().length < 2) {
      setHits([]);
      return;
    }
    const handle = setTimeout(async () => {
      setLoading(true);
      const cleaned = escapeForOr(q.trim());
      const practiceOr = `name.ilike.%${cleaned}%,owner_name.ilike.%${cleaned}%,npi.ilike.%${cleaned}%`;
      const listingOr = `listing_title.ilike.%${cleaned}%,location_city.ilike.%${cleaned}%`;

      const [practicesResp, listingsResp] = await Promise.all([
        supabase
          .from("practices")
          .select("id, name, state, owner_name")
          .or(practiceOr)
          .order("name", { ascending: true })
          .limit(5),
        supabase
          .from("broker_signals")
          .select("id, listing_title, location_state, location_city, practice_id, listing_url")
          .or(listingOr)
          .order("first_seen_at", { ascending: false })
          .limit(5),
      ]);

      // Practices fallback: if .or() failed (e.g. owner_name missing), retry name-only.
      let practiceData: any = practicesResp.data;
      if (practicesResp.error) {
        const narrow = await supabase
          .from("practices")
          .select("id, name, state")
          .ilike("name", `%${q.trim()}%`)
          .order("name", { ascending: true })
          .limit(5);
        practiceData = narrow.data;
      }

      const merged: Hit[] = [
        ...((practiceData as any[] | null) || []).map((p): Hit => ({
          kind: "practice",
          id: p.id,
          name: p.name ?? null,
          state: p.state ?? null,
          owner_name: p.owner_name ?? null,
        })),
        ...((listingsResp.data as any[] | null) || []).map((l): Hit => ({
          kind: "listing",
          id: l.id,
          listing_title: l.listing_title ?? null,
          location_state: l.location_state ?? null,
          location_city: l.location_city ?? null,
          practice_id: l.practice_id ?? null,
          listing_url: l.listing_url ?? null,
        })),
      ];

      setHits(merged);
      setLoading(false);
    }, 220);
    return () => clearTimeout(handle);
  }, [q]);

  function destination(h: Hit): string {
    if (h.kind === "practice") return `/practice/${h.id}`;
    if (h.practice_id) return `/practice/${h.practice_id}`;
    return h.listing_url || "/universe";
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (hits[0]) {
      router.push(destination(hits[0]));
      setOpen(false);
      setQ("");
    }
  }

  return (
    <div ref={wrapperRef} className="relative">
      <form
        onSubmit={onSubmit}
        className="flex items-center gap-2 px-3 py-1.5 w-full md:min-w-[280px] lg:min-w-[360px]"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
      >
        <Search size={12} style={{ color: "var(--text-3)" }} />
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Search practices, owners, listings…"
          className="flex-1 bg-transparent text-[12px] outline-none mono"
          style={{ color: "var(--text-1)" }}
          autoComplete="off"
          spellCheck={false}
        />
        <span
          className="flex items-center gap-1 mono text-[9px] tracking-[0.1em] px-1.5 py-0.5"
          style={{ color: "var(--text-3)", border: "1px solid var(--border)" }}
        >
          <Command size={10} /> K
        </span>
      </form>

      {open && q.trim().length >= 2 && (
        <div
          className="absolute left-0 right-0 mt-1 z-30 max-h-[320px] overflow-auto"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        >
          {loading && (
            <div className="px-3 py-2 mono text-[10px]" style={{ color: "var(--text-3)" }}>
              SEARCHING…
            </div>
          )}
          {!loading && hits.length === 0 && (
            <div className="px-3 py-3 mono text-[10px]" style={{ color: "var(--text-3)" }}>
              No matches in <span style={{ color: "var(--text-2)" }}>practices</span> or{" "}
              <span style={{ color: "var(--text-2)" }}>broker_signals</span>.
            </div>
          )}
          {hits.map((h) => (
            <Link
              key={`${h.kind}-${h.id}`}
              href={destination(h)}
              onClick={() => { setOpen(false); setQ(""); }}
              className="flex items-center justify-between px-3 py-2 hover:bg-white/[0.03] gap-3"
              style={{ borderBottom: "1px solid var(--border-subtle)" }}
            >
              <div className="flex items-center gap-2 min-w-0">
                {h.kind === "practice" ? (
                  <Building2 size={11} style={{ color: "var(--data)" }} />
                ) : (
                  <Tag size={11} style={{ color: "var(--signal)" }} />
                )}
                <div className="min-w-0">
                  <div className="text-[12px] truncate" style={{ color: "var(--text-1)" }}>
                    {h.kind === "practice" ? (h.name || "—") : (h.listing_title || "Untitled listing")}
                  </div>
                  <div className="mono text-[9.5px] truncate" style={{ color: "var(--text-3)" }}>
                    {h.kind === "practice"
                      ? (h.owner_name || "practice")
                      : `${h.location_city || ""}${h.location_city && h.location_state ? ", " : ""}${h.location_state || ""}` || "broker listing"}
                  </div>
                </div>
              </div>
              {h.kind === "practice" && h.state && (
                <span className="mono text-[10px] tracking-[0.12em] shrink-0" style={{ color: "var(--data)" }}>
                  {h.state}
                </span>
              )}
              {h.kind === "listing" && h.location_state && (
                <span className="mono text-[10px] tracking-[0.12em] shrink-0" style={{ color: "var(--signal)" }}>
                  {h.location_state}
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
