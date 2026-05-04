"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Status = "connecting" | "live" | "offline" | "error";

const STATUS_META: Record<Status, { label: string; color: string; pulse: boolean }> = {
  connecting: { label: "CONNECTING",   color: "var(--text-3)",   pulse: true  },
  live:       { label: "LIVE",         color: "var(--positive)", pulse: true  },
  offline:    { label: "OFFLINE",      color: "var(--text-3)",   pulse: false },
  error:      { label: "ERROR",        color: "var(--critical)", pulse: false },
};

/**
 * Subscribes to outreach_log INSERT/UPDATE events and triggers router.refresh()
 * (debounced) so the server-rendered table re-fetches.
 *
 * Requires Supabase Realtime to be enabled for `public.outreach_log`. In the
 * Supabase dashboard: Database → Replication → toggle the table on. Or via SQL:
 *   alter publication supabase_realtime add table public.outreach_log;
 *
 * Renders an inline status badge (LIVE / CONNECTING / OFFLINE / ERROR).
 */
export function OutreachRealtime() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("connecting");
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("outreach_log:changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "outreach_log" },
        () => {
          // Debounce: a webhook can fire multiple events back-to-back.
          if (refreshTimer.current) clearTimeout(refreshTimer.current);
          refreshTimer.current = setTimeout(() => router.refresh(), 250);
        }
      )
      .subscribe((s: string) => {
        if (s === "SUBSCRIBED") setStatus("live");
        else if (s === "CHANNEL_ERROR" || s === "TIMED_OUT") setStatus("error");
        else if (s === "CLOSED") setStatus("offline");
        else setStatus("connecting");
      });

    return () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      supabase.removeChannel(channel);
    };
  }, [router]);

  const meta = STATUS_META[status];

  return (
    <span
      className="inline-flex items-center gap-1.5 mono text-[9px] tracking-[0.18em] px-1.5 py-0.5"
      style={{
        color: meta.color,
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
      }}
      title={
        status === "live"
          ? "Realtime subscription active — new outreach + Apollo replies appear without refresh."
          : status === "connecting"
          ? "Establishing realtime channel…"
          : status === "error"
          ? "Realtime channel errored. Make sure outreach_log is in the supabase_realtime publication."
          : "Realtime channel closed."
      }
    >
      <span
        className={`w-1.5 h-1.5 rounded-full${meta.pulse && status === "live" ? " status-live" : ""}`}
        style={{ background: meta.color }}
      />
      {meta.label}
    </span>
  );
}
