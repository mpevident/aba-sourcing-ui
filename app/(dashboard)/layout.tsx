import { Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/topbar";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();

  const [
    { count: universeCount },
    { count: pipelinePursuing },
    { count: outreachAwaiting },
    { count: signalsTotal },
  ] = await Promise.all([
    supabase.from("broker_signals").select("*", { count: "exact", head: true }),
    supabase.from("broker_signals").select("*", { count: "exact", head: true }).eq("status", "pursuing"),
    supabase.from("outreach_log").select("*", { count: "exact", head: true }).eq("status", "sent").is("replied_at", null),
    supabase.from("signals").select("*", { count: "exact", head: true }),
  ]);

  const counts = {
    universe: universeCount ?? 0,
    pipeline: pipelinePursuing ?? 0,
    outreach: outreachAwaiting ?? 0,
    signals: signalsTotal ?? 0,
  };

  return (
    <div className="min-h-screen flex" style={{ background: "var(--bg-base)" }}>
      <Sidebar counts={counts} />
      <div className="flex-1 md:ml-[200px] flex flex-col min-h-screen min-w-0">
        <TopBar />
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
