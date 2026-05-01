"use client";
import { ScoreBadge } from "./score-badge";
import { ExternalLink } from "lucide-react";

interface Lead {
  id: string;
  listing_title: string | null;
  listing_url: string | null;
  asking_price: number | null;
  revenue_claimed: number | null;
  location_city: string | null;
  location_state: string | null;
  source_site: string | null;
  score: number | null;
  cst_fit: boolean | null;
  status: string | null;
}

function fmt(n: number | null): string {
  if (!n) return "—";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

export function LeadTable({ rows, title = "TOP LEADS · RANKED BY SCORE" }: { rows: Lead[]; title?: string }) {
  return (
    <div className="flex flex-col" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
      <div
        className="px-4 py-2.5 flex items-center justify-between sticky top-0"
        style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-card)" }}
      >
        <span className="mono text-[10px] tracking-[0.18em]" style={{ color: "var(--text-3)" }}>{title}</span>
        <span className="mono text-[10px] tnum" style={{ color: "var(--text-3)" }}>
          {rows.length} ROWS
        </span>
      </div>
      <table className="w-full text-[11.5px] mono">
        <thead>
          <tr style={{ background: "var(--bg-surface)" }}>
            {["#", "SCORE", "LISTING", "STATE", "REV", "ASK", "SOURCE", "STATUS", ""].map((h, i) => (
              <th
                key={h+i}
                className="text-left font-medium tracking-[0.15em] text-[9px] px-3 py-2"
                style={{ color: "var(--text-3)", borderBottom: "1px solid var(--border)" }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={9} className="px-4 py-8 text-center mono text-[11px]" style={{ color: "var(--text-3)" }}>
                NO LEADS YET — RUN PHASE 1 SCRAPE
              </td>
            </tr>
          )}
          {rows.map((r, i) => (
            <tr
              key={r.id}
              className="hover:bg-[var(--bg-card-hover)] transition-colors"
              style={{ borderBottom: "1px solid var(--border-subtle)" }}
            >
              <td className="px-3 py-2.5 tnum" style={{ color: "var(--text-3)" }}>{String(i+1).padStart(2,'0')}</td>
              <td className="px-3 py-2.5"><ScoreBadge score={r.score} /></td>
              <td className="px-3 py-2.5 max-w-[320px]">
                <div className="font-sans text-[12px] truncate" style={{ color: "var(--text-1)" }}>
                  {r.listing_title || "—"}
                </div>
                {r.location_city && (
                  <div className="text-[10px] mt-0.5" style={{ color: "var(--text-3)" }}>
                    {r.location_city}{r.location_state ? `, ${r.location_state}` : ""}
                  </div>
                )}
              </td>
              <td className="px-3 py-2.5 tracking-[0.1em]" style={{ color: r.location_state ? "var(--data)" : "var(--text-4)" }}>
                {r.location_state || "—"}
              </td>
              <td className="px-3 py-2.5 tnum" style={{ color: "var(--text-2)" }}>{fmt(r.revenue_claimed)}</td>
              <td className="px-3 py-2.5 tnum" style={{ color: "var(--text-1)" }}>{fmt(r.asking_price)}</td>
              <td className="px-3 py-2.5" style={{ color: "var(--text-3)" }}>{r.source_site || "—"}</td>
              <td className="px-3 py-2.5">
                {r.status && (
                  <span
                    className="inline-flex items-center px-1.5 py-0.5 mono text-[9px] tracking-[0.15em]"
                    style={{
                      color: r.status === "pursuing" ? "var(--data)"
                           : r.status === "passed" ? "var(--critical)"
                           : r.status === "closed" ? "var(--positive)"
                           : "var(--text-2)",
                      background: "var(--bg-surface)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    {r.status.toUpperCase()}
                  </span>
                )}
              </td>
              <td className="px-3 py-2.5">
                {r.listing_url && (
                  <a href={r.listing_url} target="_blank" rel="noreferrer" style={{ color: "var(--text-3)" }}>
                    <ExternalLink size={11} />
                  </a>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
