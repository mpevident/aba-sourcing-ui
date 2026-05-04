import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  /** Short body. Plain string or a node when you need formatted hints. */
  body?: ReactNode;
  /** Optional small action below the body. */
  action?: ReactNode;
  /** Wrapper padding tier — "lg" for full-card empties, "sm" for inline. */
  size?: "sm" | "lg";
}

/**
 * Consistent empty-state visual — used inside tables, lists, and panels.
 */
export function EmptyState({ icon: Icon, title, body, action, size = "lg" }: EmptyStateProps) {
  const py = size === "lg" ? "py-12" : "py-6";
  return (
    <div className={`px-4 ${py} flex flex-col items-center justify-center gap-2 text-center`}>
      {Icon && (
        <div
          className="w-9 h-9 flex items-center justify-center mb-1"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: 2,
            color: "var(--text-3)",
          }}
        >
          <Icon size={16} strokeWidth={1.75} />
        </div>
      )}
      <div
        className="mono text-[10px] tracking-[0.18em] uppercase"
        style={{ color: "var(--text-2)" }}
      >
        {title}
      </div>
      {body && (
        <div className="mono text-[10.5px] max-w-md" style={{ color: "var(--text-3)" }}>
          {body}
        </div>
      )}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
