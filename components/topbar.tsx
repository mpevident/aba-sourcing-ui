"use client";
import { Search, Command } from "lucide-react";
import { useEffect, useState } from "react";

function nowStamp() {
  const d = new Date();
  return d.toISOString().replace("T", " ").slice(0, 19) + "Z";
}

export function TopBar() {
  const [stamp, setStamp] = useState(nowStamp());
  useEffect(() => {
    const t = setInterval(() => setStamp(nowStamp()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div
      className="h-11 flex items-center justify-between px-4 sticky top-0 z-20"
      style={{ background: "var(--bg-surface)", borderBottom: "1px solid var(--border)" }}
    >
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full status-live" style={{ background: "var(--positive)" }} />
          <span className="mono text-[10px] tracking-[0.15em]" style={{ color: "var(--text-2)" }}>
            CONN · LIVE
          </span>
        </div>
        <span style={{ color: "var(--text-4)" }}>·</span>
        <span className="mono text-[10px] tracking-[0.1em] tnum" style={{ color: "var(--text-3)" }}>
          {stamp}
        </span>
      </div>

      <div
        className="flex items-center gap-2 px-3 py-1.5 min-w-[360px]"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
      >
        <Search size={12} style={{ color: "var(--text-3)" }} />
        <input
          placeholder="Query intel — practices, owners, signals…"
          className="flex-1 bg-transparent text-[12px] outline-none mono"
          style={{ color: "var(--text-1)" }}
        />
        <span
          className="flex items-center gap-1 mono text-[9px] tracking-[0.1em] px-1.5 py-0.5"
          style={{ color: "var(--text-3)", border: "1px solid var(--border)" }}
        >
          <Command size={10} /> K
        </span>
      </div>

      <div className="flex items-center gap-3 mono text-[10px] tracking-[0.15em]">
        <div className="flex items-center gap-1.5">
          <span style={{ color: "var(--text-3)" }}>SCRAPERS</span>
          <span style={{ color: "var(--positive)" }}>5/5</span>
        </div>
        <span style={{ color: "var(--text-4)" }}>·</span>
        <div className="flex items-center gap-1.5">
          <span style={{ color: "var(--text-3)" }}>QUEUE</span>
          <span style={{ color: "var(--data)" }} className="tnum">0</span>
        </div>
        <span style={{ color: "var(--text-4)" }}>·</span>
        <div className="flex items-center gap-1.5">
          <span style={{ color: "var(--text-3)" }}>OPERATOR</span>
          <span style={{ color: "var(--text-1)" }}>M.PAVLOVSKYI</span>
        </div>
      </div>
    </div>
  );
}
