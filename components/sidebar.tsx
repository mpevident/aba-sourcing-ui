"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Activity, Database, GitBranch, Mail, Radar, BriefcaseBusiness, Settings, Hexagon, Menu, X } from "lucide-react";

type CountKey = "universe" | "pipeline" | "outreach" | "signals";

interface NavItem {
  href: string;
  label: string;
  icon: typeof Activity;
  badge?: string | null;
  countKey?: CountKey;
}

const NAV: NavItem[] = [
  { href: "/", label: "INTEL FEED", icon: Activity, badge: "LIVE" },
  { href: "/universe", label: "UNIVERSE", icon: Database, countKey: "universe" },
  { href: "/pipeline", label: "PIPELINE", icon: GitBranch, countKey: "pipeline" },
  { href: "/outreach", label: "OUTREACH", icon: Mail, countKey: "outreach" },
];

const SECONDARY: NavItem[] = [
  { href: "/signals", label: "SIGNAL STREAM", icon: Radar, countKey: "signals" },
  { href: "/brokers", label: "BROKERS", icon: BriefcaseBusiness },
  { href: "/settings", label: "SETTINGS", icon: Settings },
];

export interface SidebarCounts {
  universe: number;
  pipeline: number;
  outreach: number;
  signals: number;
}

export function Sidebar({ counts }: { counts?: SidebarCounts }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);

  // Close drawer when route changes (mobile UX).
  useEffect(() => {
    setOpen(false);
  }, [path]);

  // Lock body scroll when drawer is open on mobile.
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = prev; };
    }
  }, [open]);

  function fmt(n: number | undefined): string {
    if (n == null) return "";
    if (n >= 10_000) return `${(n / 1000).toFixed(0)}K`;
    if (n >= 1_000) return `${(n / 1000).toFixed(1)}K`;
    return String(n);
  }

  return (
    <>
      {/* Mobile hamburger — visible below md breakpoint */}
      <button
        type="button"
        aria-label="Open navigation"
        onClick={() => setOpen(true)}
        className="md:hidden fixed top-2.5 left-2.5 z-40 p-1.5 transition-opacity"
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          color: "var(--text-2)",
          opacity: open ? 0 : 1,
          pointerEvents: open ? "none" : "auto",
        }}
      >
        <Menu size={16} />
      </button>

      {/* Mobile backdrop */}
      <div
        className={`md:hidden fixed inset-0 z-30 transition-opacity ${open ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        style={{ background: "rgba(6,8,12,0.7)" }}
        onClick={() => setOpen(false)}
        aria-hidden
      />

      {/* Sidebar — fixed at md+, drawer below */}
      <aside
        className={`fixed left-0 top-0 h-full w-[220px] md:w-[200px] flex flex-col z-40 transform transition-transform md:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
        style={{ background: "var(--bg-surface)", borderRight: "1px solid var(--border)" }}
      >
        <div className="px-4 py-4 border-b flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
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
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setOpen(false)}
            className="md:hidden p-1"
            style={{ color: "var(--text-3)" }}
          >
            <X size={14} />
          </button>
        </div>

        <div className="px-3 pt-4 pb-1.5">
          <span className="text-[9px] tracking-[0.2em] mono" style={{ color: "var(--text-3)" }}>
            OPERATIONS
          </span>
        </div>
        <nav className="px-2 flex flex-col gap-0.5">
          {NAV.map(({ href, label, icon: Icon, badge, countKey }) => {
            const active = path === href;
            const count = countKey && counts ? counts[countKey] : undefined;
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
                {!badge && count != null && (
                  <span
                    className="text-[9px] tracking-[0.1em] tnum px-1.5 py-px"
                    style={{ color: "var(--text-3)" }}
                  >
                    {fmt(count)}
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
          {SECONDARY.map(({ href, label, icon: Icon, countKey }) => {
            const active = path === href;
            const count = countKey && counts ? counts[countKey] : undefined;
            return (
              <Link
                key={href}
                href={href}
                className="flex items-center justify-between gap-2 px-2.5 py-2 transition-colors mono text-[10.5px] tracking-[0.1em]"
                style={{
                  color: active ? "var(--data)" : "var(--text-3)",
                  borderLeft: active ? "2px solid var(--data)" : "2px solid transparent",
                }}
              >
                <span className="flex items-center gap-2.5">
                  <Icon size={13} strokeWidth={1.5} />
                  {label}
                </span>
                {count != null && (
                  <span className="text-[9px] tnum tracking-[0.1em]" style={{ color: "var(--text-3)" }}>
                    {fmt(count)}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto px-3 py-3 border-t" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center justify-between text-[9px] mono tracking-[0.15em]" style={{ color: "var(--text-3)" }}>
            <span>OPENCLAW</span>
            <span style={{ color: "var(--text-2)" }}>upstream</span>
          </div>
          <div className="text-[9px] mono mt-1" style={{ color: "var(--text-3)" }}>
            See INTEL FEED for live scraper health.
          </div>
        </div>
      </aside>
    </>
  );
}
