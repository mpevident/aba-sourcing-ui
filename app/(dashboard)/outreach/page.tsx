import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { OutreachCompose } from "@/components/outreach-compose";
import { OutreachRealtime } from "@/components/outreach-realtime";
import { PageHeader, RailStat } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Mail } from "lucide-react";
export const dynamic = 'force-dynamic';

const STATUS_STYLE: Record<string, { color: string; bg: string }> = {
  replied:    { color: "var(--positive)", bg: "rgba(74,222,128,0.10)" },
  sent:       { color: "var(--data)",     bg: "rgba(77,217,230,0.10)" },
  nda_signed: { color: "var(--signal)",   bg: "rgba(183,148,246,0.12)" },
};
const STATUS_DEFAULT = { color: "var(--text-3)", bg: "rgba(155,165,184,0.06)" };

export default async function Outreach({
  searchParams,
}: {
  searchParams: Promise<{ practice_id?: string }>;
}) {
  const { practice_id } = await searchParams;
  const supabase = await createClient();

  const [{ data: logs }, prefetched] = await Promise.all([
    supabase
      .from("outreach_log")
      .select("*, practices(name, state)")
      .order("created_at", { ascending: false })
      .limit(100),
    practice_id
      ? supabase.from("practices").select("id, name, state").eq("id", practice_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const initialPractice = (prefetched as any)?.data
    ? {
        id: (prefetched as any).data.id,
        name: (prefetched as any).data.name || "—",
        state: (prefetched as any).data.state ?? null,
      }
    : null;

  const sentCount = (logs || []).filter((l) => l.status === "sent" && !l.replied_at).length;
  const repliedCount = (logs || []).filter((l) => l.status === "replied" || l.replied_at).length;

  return (
    <div className="bg-grid">
      <PageHeader
        eyebrow="ABA-INTEL · OUTREACH"
        title="Outreach"
        subtitle="Contact tracking and CRM · auto-refreshes on Apollo events"
        liveBadge={<OutreachRealtime />}
        rail={
          <>
            <RailStat label="AWAITING REPLY" value={sentCount} tone="warning" />
            <RailStat label="REPLIED" value={repliedCount} tone="positive" />
            <RailStat label="TOTAL" value={(logs || []).length} />
          </>
        }
      />
      <div className="p-8 pt-6">
      <OutreachCompose initialPractice={initialPractice} />
      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
        <table className="w-full">
          <thead>
            <tr style={{ background: "var(--bg-card)", borderBottom: "1px solid var(--border)" }}>
              {["Practice", "Type", "Recipient", "Status", "Sent", "Replied"].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text-3)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {logs?.map(l => {
              const s = STATUS_STYLE[l.status as string] ?? STATUS_DEFAULT;
              return (
                <tr key={l.id} className="hover:bg-white/[0.02]" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  <td className="px-4 py-3 text-sm" style={{ color: "var(--text-1)" }}>
                    {l.practice_id ? (
                      <Link href={`/practice/${l.practice_id}`} className="hover:opacity-80">
                        {(l.practices as any)?.name || "—"}
                      </Link>
                    ) : (
                      (l.practices as any)?.name || "—"
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs capitalize" style={{ color: "var(--text-3)" }}>{l.outreach_type}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: "var(--text-3)" }}>{l.recipient_name || l.recipient_email || "—"}</td>
                  <td className="px-4 py-3">
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize"
                      style={{ color: s.color, background: s.bg }}
                    >
                      {l.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: "var(--text-3)" }}>
                    {l.sent_at ? new Date(l.sent_at).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: "var(--text-3)" }}>
                    {l.replied_at ? new Date(l.replied_at).toLocaleDateString() : "—"}
                  </td>
                </tr>
              );
            })}
            {(!logs || logs.length === 0) && (
              <tr>
                <td colSpan={6}>
                  <EmptyState
                    icon={Mail}
                    title="No outreach logged yet"
                    body="Use “+ LOG OUTREACH” above, or wait for the first Apollo reply to arrive via webhook."
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      </div>
    </div>
  );
}
