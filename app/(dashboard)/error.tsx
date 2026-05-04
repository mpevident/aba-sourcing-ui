"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("[dashboard error]", error);
  }, [error]);

  return (
    <div className="bg-grid p-8 max-w-3xl">
      <div className="mb-2 mono text-[10px] tracking-[0.2em]" style={{ color: "var(--critical)" }}>
        ABA-INTEL · ERROR
      </div>
      <h1 className="text-[20px] font-semibold tracking-tight" style={{ color: "var(--text-1)" }}>
        Something broke rendering this page.
      </h1>
      <p className="mt-2 mono text-[11px]" style={{ color: "var(--text-2)" }}>
        {error.message || "Unknown error."}
      </p>
      {error.digest && (
        <p className="mt-1 mono text-[10px]" style={{ color: "var(--text-3)" }}>
          digest: {error.digest}
        </p>
      )}
      <div className="mt-4 flex items-center gap-2">
        <button
          type="button"
          onClick={reset}
          className="mono text-[10px] tracking-[0.15em] px-3 py-1.5"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-bright)",
            color: "var(--data)",
          }}
        >
          RETRY
        </button>
        <Link
          href="/"
          className="mono text-[10px] tracking-[0.15em] px-3 py-1.5"
          style={{ color: "var(--text-3)", border: "1px solid var(--border)" }}
        >
          INTEL FEED
        </Link>
      </div>
    </div>
  );
}
