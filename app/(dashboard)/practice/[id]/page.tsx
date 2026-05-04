import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ScoreBadge } from "@/components/score-badge";
import { Sparkline } from "@/components/sparkline";
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

export default async function PracticeDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [
    { data: practice },
    { data: signals },
    { data: latestScore },
    { data: scoreHistory },
    { data: outreach },
    { data: matchingListings },
  ] = await Promise.all([
    supabase.from("practices").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("signals")
      .select("*")
      .eq("practice_id", id)
      .order("observed_at", { ascending: false })
      .limit(50),
    supabase
      .from("scores")
      .select("*")
      .eq("practice_id", id)
      .order("computed_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("scores")
      .select("score, computed_at")
      .eq("practice_id", id)
      .order("computed_at", { ascending: true })
      .limit(60),
    supabase
      .from("outreach_log")
      .select("*")
      .eq("practice_id", id)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("broker_signals")
      .select("id, listing_title, listing_url, source_site, score, asking_price, revenue_claimed, first_seen_at, status")
      .eq("practice_id", id)
      .order("first_seen_at", { ascending: false })
      .limit(20),
  ]);

  if (!practice) notFound();

  const p = practice as any;
  const score = latestScore as any;

  // Status history audit — fetch after we know the listing IDs.
  // Joined via target_id (text), not a FK, so must be a follow-up query.
  const listingIds = (matchingListings as any[] | null || []).map((l) => l.id);
  let statusHistory: any[] = [];
  if (listingIds.length > 0) {
    const { data } = await supabase
      .from("status_changes")
      .select("id, target_id, from_status, to_status, source, changed_at")
      .eq("target_table", "broker_signals")
      .in("target_id", listingIds)
      .order("changed_at", { ascending: false })
      .limit(50);
    statusHistory = data || [];
  }
  const listingTitleById: Record<string, string> = {};
  for (const l of (matchingListings as any[] | null || [])) {
    listingTitleById[l.id] = l.listing_title || `listing ${String(l.id).slice(0, 8)}`;
  }

  return (
    <div className="bg-grid">
      <PageHeader
        eyebrow={
          <Link
            href="/universe"
            className="inline-flex items-center gap-1.5 hover:opacity-80"
            style={{ color: "var(--text-3)" }}
          >
            <ArrowLeft size={11} /> UNIVERSE
          </Link>
        }
        title={p.name || "Unnamed practice"}
        subtitle={
          <span className="inline-flex items-center gap-3 flex-wrap" style={{ color: "var(--text-2)" }}>
            {p.city && <span>{p.city}</span>}
            {p.state && <span style={{ color: "var(--data)" }}>{p.state}</span>}
            {p.npi && <span>NPI {p.npi}</span>}
            {p.medicaid_id && <span>MEDICAID {p.medicaid_id}</span>}
            {p.sos_entity_id && <span>SOS {p.sos_entity_id}</span>}
          </span>
        }
        liveBadge={
          <RealtimeWatcher
            tables={["signals", "scores", "outreach_log"]}
            filter={{ column: "practice_id", value: id }}
            channelKey={`practice-${id}`}
          />
        }
        rail={
          <>
            <Link
              href={`/outreach?practice_id=${id}`}
              className="px-2.5 py-1.5 hover:opacity-80 transition-opacity"
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border-bright)",
                color: "var(--data)",
              }}
            >
              + LOG OUTREACH
            </Link>
            <RailStat label="STATUS" value={p.status || "NEW"} />
            <RailStat label="SCORE" value={<span className="text-[14px]">{score?.score ?? "—"}</span>} tone="data" />
          </>
        }
      />

      {/* Three-up summary */}
      <div className="px-6 pt-6 grid grid-cols-3 gap-3">
        {/* Owner card */}
        <div className="px-4 py-3.5 flex flex-col gap-2 min-h-[110px]" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          <span className="mono text-[9px] tracking-[0.18em]" style={{ color: "var(--text-3)" }}>OWNER</span>
          <div className="flex flex-col gap-1">
            <span className="text-[14px]" style={{ color: "var(--text-1)" }}>
              {p.owner_name || "—"}
            </span>
            <div className="flex items-center gap-3 mono text-[10px]" style={{ color: "var(--text-3)" }}>
              {p.owner_age_proxy != null && <span>age ~{p.owner_age_proxy}</span>}
              {p.bacb_cert && <span>BACB {p.bacb_cert}</span>}
            </div>
            {p.owner_linkedin_url && (
              <a
                href={p.owner_linkedin_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 mono text-[10px] hover:opacity-80"
                style={{ color: "var(--data)" }}
              >
                <ExternalLink size={10} /> LinkedIn
              </a>
            )}
          </div>
        </div>

        {/* Practice profile card */}
        <div className="px-4 py-3.5 flex flex-col gap-2 min-h-[110px]" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          <span className="mono text-[9px] tracking-[0.18em]" style={{ color: "var(--text-3)" }}>PROFILE</span>
          <div className="grid grid-cols-2 gap-y-1 gap-x-3 mono text-[10.5px]">
            <span style={{ color: "var(--text-3)" }}>BCBAs</span>
            <span className="tnum" style={{ color: "var(--text-1)" }}>{p.bcba_count ?? "—"}</span>
            <span style={{ color: "var(--text-3)" }}>RBTs</span>
            <span className="tnum" style={{ color: "var(--text-1)" }}>{p.rbt_count ?? "—"}</span>
            <span style={{ color: "var(--text-3)" }}>Locations</span>
            <span className="tnum" style={{ color: "var(--text-1)" }}>{p.location_count ?? "—"}</span>
            <span style={{ color: "var(--text-3)" }}>Founded</span>
            <span className="tnum" style={{ color: "var(--text-1)" }}>{p.founded_year ?? "—"}</span>
            <span style={{ color: "var(--text-3)" }}>Est. revenue</span>
            <span className="tnum" style={{ color: "var(--text-1)" }}>{fmtMoney(p.estimated_revenue)}</span>
            <span style={{ color: "var(--text-3)" }}>PE-backed</span>
            <span style={{ color: "var(--text-1)" }}>{p.pe_backed ? "yes" : "no"}</span>
          </div>
        </div>

        {/* Score card */}
        <div className="px-4 py-3.5 flex flex-col gap-2 min-h-[110px]" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          <span className="mono text-[9px] tracking-[0.18em]" style={{ color: "var(--text-3)" }}>SELLER PROBABILITY</span>
          <div className="flex items-center gap-3">
            <ScoreBadge score={score?.score ?? null} />
            <div className="flex flex-col">
              <span className="mono text-[10px]" style={{ color: "var(--text-3)" }}>
                computed {fmtRelative(score?.computed_at)}
              </span>
              {score?.scoring_engine && (
                <span className="mono text-[10px]" style={{ color: "var(--text-3)" }}>
                  via {score.scoring_engine}
                </span>
              )}
            </div>
          </div>
          {score?.rationale && (
            <p className="mono text-[10.5px] line-clamp-3" style={{ color: "var(--text-2)" }}>
              {score.rationale}
            </p>
          )}
          {scoreHistory && scoreHistory.length > 1 && (
            <div className="flex items-center justify-between gap-2 mt-1">
              <Sparkline
                data={(scoreHistory as any[]).map((r) => r.score ?? 0)}
                width={140}
                height={32}
                color="var(--data)"
              />
              <span className="mono text-[9px]" style={{ color: "var(--text-3)" }}>
                {scoreHistory.length} updates
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Signal timeline + outreach side-by-side */}
      <div className="px-6 py-6 grid grid-cols-12 gap-3">
        {/* Signal timeline */}
        <div className="col-span-12 xl:col-span-7" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border)" }}>
            <span className="mono text-[10px] tracking-[0.18em]" style={{ color: "var(--text-3)" }}>
              SIGNAL TIMELINE
            </span>
            <span className="mono text-[10px]" style={{ color: "var(--text-3)" }}>
              {(signals || []).length} events
            </span>
          </div>
          <div className="divide-y" style={{ borderColor: "var(--border)" }}>
            {(signals || []).length === 0 && (
              <div className="px-4 py-12 text-center mono text-[10.5px]" style={{ color: "var(--text-3)" }}>
                No signals recorded for this practice yet.
              </div>
            )}
            {(signals as any[] || []).map((s) => (
              <div key={s.id} className="px-4 py-3 flex items-start gap-4">
                <span className="mono text-[10px] tnum w-20 shrink-0" style={{ color: "var(--text-3)" }}>
                  {fmtRelative(s.observed_at)}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="mono text-[10px] tracking-[0.12em] uppercase" style={{ color: "var(--data)" }}>
                      {s.signal_type || "signal"}
                    </span>
                    {s.weight != null && (
                      <span className="mono text-[9px]" style={{ color: "var(--text-3)" }}>
                        w={s.weight}
                      </span>
                    )}
                    {s.source && (
                      <span className="mono text-[9px]" style={{ color: "var(--text-3)" }}>
                        · {s.source}
                      </span>
                    )}
                  </div>
                  {s.summary && (
                    <p className="text-[12px] mt-0.5" style={{ color: "var(--text-1)" }}>
                      {s.summary}
                    </p>
                  )}
                  {s.raw_url && (
                    <a
                      href={s.raw_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 mono text-[9px] mt-1 hover:opacity-80"
                      style={{ color: "var(--data)" }}
                    >
                      <ExternalLink size={9} /> source
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Outreach log */}
        <div className="col-span-12 xl:col-span-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border)" }}>
            <span className="mono text-[10px] tracking-[0.18em]" style={{ color: "var(--text-3)" }}>
              OUTREACH
            </span>
            <span className="mono text-[10px]" style={{ color: "var(--text-3)" }}>
              {(outreach || []).length}
            </span>
          </div>
          <div className="divide-y" style={{ borderColor: "var(--border)" }}>
            {(outreach || []).length === 0 && (
              <div className="px-4 py-12 text-center mono text-[10.5px]" style={{ color: "var(--text-3)" }}>
                No outreach logged.
              </div>
            )}
            {(outreach as any[] || []).map((o) => (
              <div key={o.id} className="px-4 py-3">
                <div className="flex items-center justify-between">
                  <span className="mono text-[10px] tracking-[0.12em] uppercase" style={{ color: "var(--text-2)" }}>
                    {o.outreach_type || "—"}
                  </span>
                  <span
                    className="mono text-[9px] tracking-[0.12em] uppercase px-1.5 py-0.5"
                    style={{
                      color: o.status === "replied" ? "var(--positive)" : o.status === "sent" ? "var(--data)" : "var(--text-3)",
                      background: "var(--bg-surface)",
                    }}
                  >
                    {o.status || "—"}
                  </span>
                </div>
                <div className="mono text-[10.5px] mt-1" style={{ color: "var(--text-1)" }}>
                  {o.recipient_name || o.recipient_email || "—"}
                </div>
                <div className="mono text-[9px] mt-0.5" style={{ color: "var(--text-3)" }}>
                  sent {fmtDate(o.sent_at)}
                  {o.replied_at && ` · replied ${fmtDate(o.replied_at)}`}
                </div>
              </div>
            ))}
          </div>

          {/* Status history (audit) */}
          <div className="mt-3" style={{ borderTop: "1px solid var(--border)" }}>
            <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border)" }}>
              <span className="mono text-[10px] tracking-[0.18em]" style={{ color: "var(--text-3)" }}>
                STATUS HISTORY
              </span>
              <span className="mono text-[10px]" style={{ color: "var(--text-3)" }}>
                {statusHistory.length}
              </span>
            </div>
            <div className="divide-y" style={{ borderColor: "var(--border)" }}>
              {statusHistory.length === 0 && (
                <div className="px-4 py-8 text-center mono text-[10.5px]" style={{ color: "var(--text-3)" }}>
                  No status moves yet.
                </div>
              )}
              {statusHistory.map((h) => (
                <div key={h.id} className="px-4 py-2.5 flex items-start gap-3">
                  <span className="mono text-[10px] tnum w-16 shrink-0" style={{ color: "var(--text-3)" }}>
                    {fmtRelative(h.changed_at)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mono text-[10px]">
                      <span style={{ color: "var(--text-3)" }}>
                        {h.from_status || "—"}
                      </span>
                      <span style={{ color: "var(--text-3)" }}>→</span>
                      <span
                        className="tracking-[0.12em] uppercase"
                        style={{
                          color: h.to_status === "pursuing" ? "var(--data)"
                            : h.to_status === "passed" ? "var(--critical)"
                            : h.to_status === "closed" ? "var(--positive)"
                            : "var(--text-1)",
                        }}
                      >
                        {h.to_status}
                      </span>
                    </div>
                    <div className="mono text-[9px] mt-0.5 truncate" style={{ color: "var(--text-3)" }}>
                      {listingTitleById[h.target_id] || h.target_id}
                      {h.source && ` · via ${h.source}`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Matching broker listings */}
      {matchingListings && matchingListings.length > 0 && (
        <div className="px-6 pb-6">
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border)" }}>
              <span className="mono text-[10px] tracking-[0.18em]" style={{ color: "var(--text-3)" }}>
                MATCHING BROKER LISTINGS
              </span>
              <span className="mono text-[10px]" style={{ color: "var(--text-3)" }}>
                {matchingListings.length}
              </span>
            </div>
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {["Score", "Listing", "Source", "Asking", "Revenue", "First seen", "Status"].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-2.5 text-left mono text-[9px] tracking-[0.15em] uppercase"
                      style={{ color: "var(--text-3)" }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(matchingListings as any[]).map((l) => (
                  <tr key={l.id} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td className="px-4 py-2.5"><ScoreBadge score={l.score} /></td>
                    <td className="px-4 py-2.5 max-w-md">
                      <a
                        href={l.listing_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[12px] hover:opacity-80 line-clamp-1"
                        style={{ color: "var(--text-1)" }}
                      >
                        {l.listing_title || "Untitled"}
                      </a>
                    </td>
                    <td className="px-4 py-2.5 mono text-[10px]" style={{ color: "var(--text-2)" }}>
                      {l.source_site || "—"}
                    </td>
                    <td className="px-4 py-2.5 mono text-[10.5px] tnum" style={{ color: "var(--text-2)" }}>
                      {fmtMoney(l.asking_price)}
                    </td>
                    <td className="px-4 py-2.5 mono text-[10.5px] tnum" style={{ color: "var(--text-2)" }}>
                      {fmtMoney(l.revenue_claimed)}
                    </td>
                    <td className="px-4 py-2.5 mono text-[10px]" style={{ color: "var(--text-3)" }}>
                      {fmtRelative(l.first_seen_at)}
                    </td>
                    <td className="px-4 py-2.5 mono text-[10px] capitalize" style={{ color: "var(--text-2)" }}>
                      {l.status || "new"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
