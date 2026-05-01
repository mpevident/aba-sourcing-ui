"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Database, GitBranch, Mail, Radar, Workflow, Settings, Hexagon } from "lucide-react";

const NAV = [
  { href: "/", label: "INTEL FEED", icon: Activity, badge: "LIVE" },
  { href: "/universe", label: "UNIVERSE", icon: Database, badge: null },
  { href: "/pipeline", label: "PIPELINE", icon: GitBranch, badge: null },
  { href: "/outreach", label: "OUTREACH", icon: Mail, badge: null },
];

const SECONDARY = [
  { href: "/signals", label: "SIGNAL STREAM", icon: Radar },
  { href: "/operators", label: "OPERATORS", icon: Workflow },
  { href: "/settings", label: "SETTINGS", icon: Settings },
];

export function Sidebar() {
  const path = usePathname();

  return (
    <aside
      className="fixed left-0 top-0 h-full w-[200px] flex flex-col z-30"
      style={{ background: "var(--bg-surface)", borderRight: "1px solid var(--border)" }}
    >
      <div className="px-4 py-4 border-b" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 flex items-center justify-center"
            style={{ background: "rgba(77,217,230,0.08)", border: "1px solid var(--border-bright)" }}
          >
            <Hexagon size={16} strokeWidth={2} style={{ color: "var(--data)" }} />
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] font-semibold tracking-[0.12em] mono" style={{ color: "var(--text-1)" }}>
              ABA INTEL
            </span>
            <span className="text-[9px] tracking-[0.18em] mono" style={{ color: "var(--text-3)" }}>
              CST · v0.1
            </span>
          </div>
        </div>
      </div>

      <div className="px-3 pt-4 pb-1.5">
        <span className="text-[9px] tracking-[0.2em] mono" style={{ color: "var(--text-3)" }}>
          OPERATIONS
        </span>
      </div>
      <nav className="px-2 flex flex-col gap-0.5">
        {NAV.map(({ href, label, icon: Icon, badge }) => {
          const active = path === href;
          return (
            <Link
              key={href}
              href={href}
              className="group flex items-center justify-between gap-2 px-2.5 py-2 transition-colors mono text-[10.5px] tracking-[0.1em]"
              style={{
                background: active ? "rgba(77,217,230,0.06)" : "transparent",
                color: active ? "var(--data)" : "var(--text-2)",
                borderLeft: active ? "2px solid var(--data)" : "2px solid transparent",
              }}
            >
              <span className="flex items-center gap-2.5">
                <Icon size={13} strokeWidth={1.75} />
                {label}
              </span>
              {badge && (
                <span
                  className="text-[8px] tracking-[0.15em] px-1.5 py-0.5"
                  style={{
                    color: "var(--positive)",
                    background: "rgba(74,222,128,0.08)",
                    border: "1px solid rgba(74,222,128,0.2)",
                  }}
                >
                  {badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 pt-5 pb-1.5">
        <span className="text-[9px] tracking-[0.2em] mono" style={{ color: "var(--text-3)" }}>
          SYSTEM
        </span>
      </div>
      <nav className="px-2 flex flex-col gap-0.5">
        {SECONDARY.map(({ href, label, icon: Icon }) => {
          const active = path === href;
          return (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2.5 px-2.5 py-2 transition-colors mono text-[10.5px] tracking-[0.1em]"
              style={{
                color: active ? "var(--data)" : "var(--text-3)",
                borderLeft: active ? "2px solid var(--data)" : "2px solid transparent",
              }}
            >
              <Icon size={13} strokeWidth={1.5} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto px-3 py-3 border-t" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center justify-between text-[9px] mono tracking-[0.15em]" style={{ color: "var(--text-3)" }}>
          <span>OPENCLAW</span>
          <span style={{ color: "var(--text-2)" }}>2026.4.29</span>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <span
            className="w-1.5 h-1.5 rounded-full status-live"
            style={{ background: "var(--positive)" }}
          />
          <span className="text-[9px] mono tracking-[0.15em]" style={{ color: "var(--text-2)" }}>
            GATEWAY ONLINE
          </span>
        </div>
      </div>
    </aside>
  );
}
