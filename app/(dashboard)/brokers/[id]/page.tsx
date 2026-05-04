import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { ScoreBadge } from "@/components/score-badge";
import { BrokerNotesEditor } from "@/components/broker-notes-editor";
import { RealtimeWatcher } from "@/components/realtime-watcher";
import { PageHeader, RailStat } from "@/components/page-header";
import { ArrowLeft, ExternalLink } from "lucide-react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function fmtMoney(n: number | null | undefined) {
  if (n == null) return "—";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

function fmtDate(s: string | null | undefined) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function fmtRelative(s: string | null | undefined) {
  if (!s) return "—";
  const ms = Date.now() - new Date(s).getTime();
  const days = Math.floor(ms / 86_400_000);
  if (days === 0) return "today";
  if (days === 1) return "1d ago";
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? "1mo ago" : `${months}mo ago`;
}

export default async function BrokerDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: broker }, { data: listings }] = await Promise.all([
    supabase.from("brokers").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("broker_signals")
      .select("id, listing_title, listing_url, source_site, location_state, location_city, score, asking_price, revenue_claimed, first_seen_at, status, practice_id")
      .eq("broker_id", id)
      .order("first_seen_at", { ascending: false })
      .limit(200),
  ]);

  if (!broker) notFound();

  const b = broker as any;
  const totalListings = (listings || []).length;
  const highFit = (listings as any[] || []).filter((l) => (l.score ?? 0) >= 70).length;
  const lastSeen = (listings as any[] || []).reduce((acc: string | null, l: any) => {
    if (!l.first_seen_at) return acc;
    if (!acc || l.first_seen_at > acc) return l.first_seen_at;
    return acc;
  }, null);

  return (
    <div className="bg-grid">
      <PageHeader
        eyebrow={
          <Link
            href="/brokers"
            className="inline-flex items-center gap-1.5 hover:opacity-80"
            style={{ color: "var(--text-3)" }}
          >
            <ArrowLeft size={11} /> BROKERS
          </Link>
        }
        title={b.name || "Unnamed broker"}
        subtitle={
          <span className="inline-flex items-center gap-3 flex-wrap" style={{ color: "var(--text-2)" }}>
            {b.firm && <span>{b.firm}</span>}
            {b.email && <span>{b.email}</span>}
            {b.phone && <span>{b.phone}</span>}
            {b.linkedin_url && (
              <a
                href={b.linkedin_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 hover:opacity-80"
                style={{ color: "var(--data)" }}
              >
                <ExternalLink size={10} /> LinkedIn
              </a>
            )}
          </span>
        }
        liveBadge={
          <RealtimeWatcher
            tables={["brokers"]}
            filter={{ column: "id", value: id }}
            channelKey={`broker-${id}`}
          />
        }
        rail={
          <>
            <RailStat label="LISTINGS" value={totalListings} tone="data" />
            <RailStat label="HIGH-FIT (≥70)" value={highFit} tone="positive" />
            <RailStat label="LAST DEAL" value={fmtRelative(lastSeen)} />
          </>
        }
      />

      {/* Notes editor */}
      <div className="px-6 pt-6">
        <BrokerNotesEditor brokerId={id} initialNotes={b.notes ?? null} />
      </div>

      {/* Listings */}
      <div className="px-6 py-6">
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border)" }}>
            <span className="mono text-[10px] tracking-[0.18em]" style={{ color: "var(--text-3)" }}>
              LISTINGS BY THIS BROKER
            </span>
            <span className="mono text-[10px]" style={{ color: "var(--text-3)" }}>
              {totalListings}
            </span>
          </div>
          <table className="w-full text-[11.5px] mono">
            <thead>
              <tr style={{ background: "var(--bg-surface)" }}>
                {["SCORE", "LISTING", "STATE", "REV", "ASK", "FIRST SEEN", "STATUS", ""].map((h) => (
                  <th
                    key={h}
                    className="text-left font-medium tracking-[0.15em] text-[9px] px-3 py-2"
                    style={{ color: "var(--text-3)", borderBottom: "1px solid var(--border)" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {totalListings === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center mono text-[10.5px]" style={{ color: "var(--text-3)" }}>
                    No listings linked to this broker.
                  </td>
                </tr>
              )}
              {(listings as any[] || []).map((l) => (
                <tr key={l.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  <td className="px-3 py-2.5"><ScoreBadge score={l.score} /></td>
                  <td className="px-3 py-2.5 max-w-[360px]">
                    {l.practice_id ? (
                      <Link
                        href={`/practice/${l.practice_id}`}
                        className="font-sans text-[12px] hover:opacity-80 line-clamp-1"
                        style={{ color: "var(--text-1)" }}
                      >
                        {l.listing_title || "Untitled"}
                      </Link>
                    ) : (
                      <span className="font-sans text-[12px] line-clamp-1" style={{ color: "var(--text-1)" }}>
                        {l.listing_title || "Untitled"}
                      </span>
                    )}
                    {l.location_city && (
                      <div className="text-[10px] mt-0.5" style={{ color: "var(--text-3)" }}>
                        {l.location_city}{l.location_state ? `, ${l.location_state}` : ""}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2.5 tracking-[0.1em]" style={{ color: "var(--data)" }}>
                    {l.location_state || "—"}
                  </td>
                  <td className="px-3 py-2.5 tnum" style={{ color: "var(--text-2)" }}>{fmtMoney(l.revenue_claimed)}</td>
                  <td className="px-3 py-2.5 tnum" style={{ color: "var(--text-1)" }}>{fmtMoney(l.asking_price)}</td>
                  <td className="px-3 py-2.5" style={{ color: "var(--text-3)" }}>{fmtDate(l.first_seen_at)}</td>
                  <td className="px-3 py-2.5 tracking-[0.12em] uppercase" style={{ color: "var(--text-2)" }}>
                    {l.status || "new"}
                  </td>
                  <td className="px-3 py-2.5">
                    {l.listing_url && (
                      <a
                        href={l.listing_url}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: "var(--text-3)" }}
                      >
                        <ExternalLink size={11} />
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
