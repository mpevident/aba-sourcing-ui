"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Database, Kanban, Mail, LogOut, Zap } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const NAV = [
  { href: "/", label: "Intelligence Feed", icon: Zap },
  { href: "/universe", label: "Deal Universe", icon: Database },
  { href: "/pipeline", label: "Pipeline", icon: Kanban },
  { href: "/outreach", label: "Outreach", icon: Mail },
];

export function Sidebar() {
  const path = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="fixed left-0 top-0 h-full w-56 flex flex-col" style={{ background: "#161B27", borderRight: "1px solid #2A3347" }}>
      {/* Logo */}
      <div className="px-5 py-5 border-b" style={{ borderColor: "#2A3347" }}>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded bg-blue-500 flex items-center justify-center text-white font-bold text-xs">A</div>
          <div>
            <div className="text-white font-semibold text-sm leading-tight">ABA Intelligence</div>
            <div className="text-slate-500 text-xs">CST Academy</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = path === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? "bg-blue-500/10 text-blue-400"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Icon size={16} strokeWidth={active ? 2 : 1.5} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Sign out */}
      <div className="px-3 py-4 border-t" style={{ borderColor: "#2A3347" }}>
        <button
          onClick={signOut}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-white/5 w-full transition-colors"
        >
          <LogOut size={16} strokeWidth={1.5} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
