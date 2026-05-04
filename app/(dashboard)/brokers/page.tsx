import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { BrokerCompose } from "@/components/broker-compose";
import { RealtimeWatcher } from "@/components/realtime-watcher";
import { PageHeader, RailStat } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { BriefcaseBusiness } from "lucide-react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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

export default async function BrokersPage() {
  const supabase = await createClient();

  // Pull brokers + listing counts. Listing counts come from a separate
  // aggregation query: PostgREST cannot do GROUP BY in a single call, so we
  // fetch broker_id rows and bucket in JS.
  const [{ data: brokers, error: brokersError }, { data: listingRows }] = await Promise.all([
    supabase.from("brokers").select("*").order("name", { ascending: true }).limit(500),
    supabase
      .from("broker_signals")
      .select("broker_id, first_seen_at")
      .not("broker_id", "is", null)
      .limit(10000),
  ]);

  // Tolerate either schema state: if broker_signals has no broker_id column,
  // listingRows will come back as null + an error we can ignore.
  const dealCount: Record<string, number> = {};
  const lastTouchByBroker: Record<string, string> = {};
  for (const r of (listingRows as any[] | null) || []) {
    const bid = r.broker_id as string | null;
    if (!bid) continue;
    dealCount[bid] = (dealCount[bid] || 0) + 1;
    if (!lastTouchByBroker[bid] || (r.first_seen_at && r.first_seen_at > lastTouchByBroker[bid])) {
      lastTouchByBroker[bid] = r.first_seen_at;
    }
  }

  return (
    <div className="bg-grid">
      <PageHeader
        eyebrow="ABA-INTEL · BROKER CRM"
        title="Brokers"
        subtitle="Firms and dealmakers · deal volume · last contact"
        liveBadge={<RealtimeWatcher tables={["brokers"]} channelKey="brokers-list" />}
        rail={
          <>
            <RailStat label="BROKERS" value={(brokers || []).length} tone="data" />
            <RailStat label="LISTINGS LINKED" value={Object.values(dealCount).reduce((a, b) => a + b, 0)} />
          </>
        }
      />

      {/* Compose */}
      <div className="px-6 pt-6">
        <BrokerCompose />
      </div>

      {/* Table */}
      <div className="px-6 pb-6">
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          <table className="w-full text-[11.5px] mono">
            <thead>
              <tr style={{ background: "var(--bg-surface)" }}>
                {["NAME", "FIRM", "CONTACT", "DEALS", "LAST TOUCH", ""].map((h) => (
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
              {brokersError && (
                <tr>
                  <td colSpan={6}>
                    <EmptyState
                      icon={BriefcaseBusiness}
                      title="Could not load brokers"
                      body="Schema may not be provisioned yet. Check Supabase or apply the migrations."
                    />
                  </td>
                </tr>
              )}
              {!brokersError && (!brokers || brokers.length === 0) && (
                <tr>
                  <td colSpan={6}>
                    <EmptyState
                      icon={BriefcaseBusiness}
                      title="No brokers in the CRM yet"
                      body="Use “+ ADD BROKER” above to log a manual entry, or wait for the engine to populate from listing metadata."
                    />
                  </td>
                </tr>
              )}
              {(brokers as any[] || []).map((b) => {
                const deals = dealCount[b.id] || 0;
                const lastTouch = b.last_touch_at || lastTouchByBroker[b.id] || null;
                return (
                  <tr key={b.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                    <td className="px-3 py-2.5">
                      <Link
                        href={`/brokers/${b.id}`}
                        className="font-sans text-[12px] hover:opacity-80"
                        style={{ color: "var(--text-1)" }}
                      >
                        {b.name || "—"}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5" style={{ color: "var(--text-2)" }}>
                      {b.firm || "—"}
                    </td>
                    <td className="px-3 py-2.5" style={{ color: "var(--text-3)" }}>
                      {b.email || b.phone || "—"}
                    </td>
                    <td className="px-3 py-2.5 tnum" style={{ color: "var(--text-1)" }}>
                      {deals}
                    </td>
                    <td className="px-3 py-2.5" style={{ color: "var(--text-3)" }}>
                      {fmtRelative(lastTouch)}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <Link
                        href={`/brokers/${b.id}`}
                        className="mono text-[10px] tracking-[0.12em]"
                        style={{ color: "var(--data)" }}
                      >
                        DETAIL →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
