"use client";
import { useEffect, useState } from "react";

const TZ = "America/Chicago";
const SCHEDULE = [
  { hour: 6, minute: 0, label: "Phase 1 scrape" },
  { hour: 7, minute: 0, label: "Telegram digest" },
  { hour: 8, minute: 0, label: "Morning briefing" },
] as const;

// Build a UTC Date that, when formatted in America/Chicago, reads as y-m-d hh:mm.
// Iterates to converge across DST transitions.
function ctClockToUtc(y: number, m: number, d: number, hh: number, mm: number): Date {
  let guess = new Date(Date.UTC(y, m - 1, d, hh, mm));
  for (let i = 0; i < 3; i++) {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: TZ,
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hourCycle: "h23",
    }).formatToParts(guess);
    const g = (t: string) => Number(parts.find((p) => p.type === t)?.value);
    const driftMin =
      (g("year") - y) * 525_600 +
      (g("month") - m) * 43_200 +
      (g("day") - d) * 1_440 +
      (g("hour") - hh) * 60 +
      (g("minute") - mm);
    if (driftMin === 0) return guess;
    guess = new Date(guess.getTime() - driftMin * 60_000);
  }
  return guess;
}

function nextOccurrence(hour: number, minute: number, now: Date): Date {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    year: "numeric", month: "2-digit", day: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const g = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const today = ctClockToUtc(g("year"), g("month"), g("day"), hour, minute);
  if (today.getTime() > now.getTime()) return today;
  const tomorrowSeed = new Date(today.getTime() + 26 * 3_600_000); // 26h to safely cross DST
  const tParts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    year: "numeric", month: "2-digit", day: "2-digit",
    hourCycle: "h23",
  }).formatToParts(tomorrowSeed);
  const tg = (t: string) => Number(tParts.find((p) => p.type === t)?.value);
  return ctClockToUtc(tg("year"), tg("month"), tg("day"), hour, minute);
}

function fmtDelta(ms: number): string {
  if (ms < 0) ms = 0;
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h >= 1) return `T-${h}h ${String(m).padStart(2, "0")}m`;
  return `T-${m}m ${String(s).padStart(2, "0")}s`;
}

export function ScheduledRuns() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const rows = SCHEDULE.map(({ hour, minute, label }) => {
    const next = now ? nextOccurrence(hour, minute, now) : null;
    const delta = next && now ? next.getTime() - now.getTime() : null;
    const timeLabel = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")} CT`;
    return { timeLabel, label, delta };
  });

  return (
    <div
      className="p-4 flex flex-col gap-2"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
    >
      <span className="mono text-[10px] tracking-[0.18em]" style={{ color: "var(--text-3)" }}>
        NEXT SCHEDULED RUNS
      </span>
      <div className="flex flex-col gap-2 mono text-[11px]">
        {rows.map((r) => (
          <div key={r.timeLabel + r.label} className="flex items-center justify-between">
            <span style={{ color: "var(--text-2)" }}>{r.timeLabel} · {r.label}</span>
            <span className="tnum" style={{ color: "var(--data)" }}>
              {r.delta == null ? "—" : fmtDelta(r.delta)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
