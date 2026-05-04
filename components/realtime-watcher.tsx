"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Status = "connecting" | "live" | "offline" | "error";

const STATUS_META: Record<Status, { label: string; color: string }> = {
  connecting: { label: "CONNECTING", color: "var(--text-3)"   },
  live:       { label: "LIVE",       color: "var(--positive)" },
  offline:    { label: "OFFLINE",    color: "var(--text-3)"   },
  error:      { label: "ERROR",      color: "var(--critical)" },
};

interface Props {
  /** Postgres tables to subscribe to (in `public` schema). */
  tables: string[];
  /** Unique channel key per page so concurrent watchers don't collide. */
  channelKey: string;
  /** Optional eq filter applied to all tables in `tables`. */
  filter?: { column: string; value: string };
  /** ms to wait after the last event before firing the side-effect. */
  debounceMs?: number;
  /** Visual: omit the badge if you only want the side-effect. */
  hidden?: boolean;
  /** Override the default side-effect (router.refresh) — useful for client
   *  pages that fetch via useEffect and need to re-run their own load fn. */
  onChange?: () => void;
}

/**
 * Generic Realtime watcher: subscribes to postgres_changes for one or more
 * tables and triggers a debounced router.refresh() when anything changes.
 * Renders a small LIVE/CONNECTING/OFFLINE/ERROR badge inline (unless hidden).
 *
 * Each table must be added to the `supabase_realtime` publication. See
 * supabase/migrations/20260504000005_more_realtime.sql for the recipe.
 */
export function RealtimeWatcher({
  tables,
  channelKey,
  filter,
  debounceMs = 250,
  hidden = false,
  onChange,
}: Props) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("connecting");
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Hold latest onChange in a ref so the effect doesn't re-subscribe each render.
  // Updated inside an effect to comply with React's "no ref writes during render" rule.
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Stable string key so the effect doesn't re-run unless inputs actually change.
  const tableKey = tables.join(",");
  const filterKey = filter ? `${filter.column}:${filter.value}` : "";

  useEffect(() => {
    const supabase = createClient();
    let channel = supabase.channel(`realtime:${channelKey}`);

    for (const table of tables) {
      const opts: Record<string, unknown> = { event: "*", schema: "public", table };
      if (filter) opts.filter = `${filter.column}=eq.${filter.value}`;
      // supabase-js's .on() narrows after the first call in the type system,
      // which fights the loop-driven config. Cast to keep ergonomics.
      channel = (channel as any).on(
        "postgres_changes",
        opts,
        () => {
          if (refreshTimer.current) clearTimeout(refreshTimer.current);
          refreshTimer.current = setTimeout(() => {
            if (onChangeRef.current) onChangeRef.current();
            else router.refresh();
          }, debounceMs);
        }
      );
    }

    channel.subscribe((s: string) => {
      if (s === "SUBSCRIBED") setStatus("live");
      else if (s === "CHANNEL_ERROR" || s === "TIMED_OUT") setStatus("error");
      else if (s === "CLOSED") setStatus("offline");
      else setStatus("connecting");
    });

    return () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, channelKey, tableKey, filterKey, debounceMs]);

  if (hidden) return null;

  const meta = STATUS_META[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 mono text-[9px] tracking-[0.18em] px-1.5 py-0.5"
      style={{
        color: meta.color,
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
      }}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full${status === "live" ? " status-live" : ""}`}
        style={{ background: meta.color }}
      />
      {meta.label}
    </span>
  );
}
