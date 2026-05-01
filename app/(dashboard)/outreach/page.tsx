import { createClient } from "@/lib/supabase/server";
export const dynamic = 'force-dynamic';

export default async function Outreach() {
  const supabase = await createClient();
  const { data: logs } = await supabase
    .from("outreach_log")
    .select("*, practices(name, state)")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-white text-2xl font-semibold">Outreach</h1>
        <p className="text-slate-400 text-sm mt-1">Contact tracking and CRM</p>
      </div>
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: "#2A3347" }}>
        <table className="w-full">
          <thead>
            <tr className="border-b" style={{ background: "#161B27", borderColor: "#2A3347" }}>
              {["Practice", "Type", "Recipient", "Status", "Sent", "Replied"].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {logs?.map(l => (
              <tr key={l.id} className="border-b hover:bg-white/[0.02]" style={{ borderColor: "#2A3347" }}>
                <td className="px-4 py-3 text-white text-sm">{(l.practices as any)?.name || "—"}</td>
                <td className="px-4 py-3 text-slate-400 text-xs capitalize">{l.outreach_type}</td>
                <td className="px-4 py-3 text-slate-400 text-xs">{l.recipient_name || l.recipient_email || "—"}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${
                    l.status === "replied"    ? "text-green-400 bg-green-500/10" :
                    l.status === "sent"       ? "text-blue-400 bg-blue-500/10" :
                    l.status === "nda_signed" ? "text-purple-400 bg-purple-500/10" :
                    "text-slate-400 bg-slate-500/10"
                  }`}>{l.status}</span>
                </td>
                <td className="px-4 py-3 text-slate-500 text-xs">
                  {l.sent_at ? new Date(l.sent_at).toLocaleDateString() : "—"}
                </td>
                <td className="px-4 py-3 text-slate-500 text-xs">
                  {l.replied_at ? new Date(l.replied_at).toLocaleDateString() : "—"}
                </td>
              </tr>
            ))}
            {(!logs || logs.length === 0) && (
              <tr>
                <td colSpan={6} className="px-4 py-16 text-center text-slate-500 text-sm">
                  No outreach logged yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
