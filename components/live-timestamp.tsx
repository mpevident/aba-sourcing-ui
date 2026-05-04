"use client";
import { useEffect, useState } from "react";

function nowStamp() {
  const d = new Date();
  return d.toISOString().replace("T", " ").slice(0, 19) + "Z";
}

export function LiveTimestamp() {
  const [stamp, setStamp] = useState<string | null>(null);
  useEffect(() => {
    setStamp(nowStamp());
    const t = setInterval(() => setStamp(nowStamp()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <span
      className="mono text-[10px] tracking-[0.1em] tnum"
      style={{ color: "var(--text-3)" }}
      suppressHydrationWarning
    >
      {stamp ?? "————-——-—— ——:——:——Z"}
    </span>
  );
}
