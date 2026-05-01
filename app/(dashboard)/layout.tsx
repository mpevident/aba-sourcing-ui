import { Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/topbar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex" style={{ background: "var(--bg-base)" }}>
      <Sidebar />
      <div className="flex-1 ml-[200px] flex flex-col min-h-screen">
        <TopBar />
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
