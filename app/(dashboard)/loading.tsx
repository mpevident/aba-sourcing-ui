export default function DashboardLoading() {
  return (
    <div className="bg-grid p-6 flex items-center gap-2 mono text-[10px] tracking-[0.2em]" style={{ color: "var(--text-3)" }}>
      <span
        className="w-1.5 h-1.5 rounded-full status-live"
        style={{ background: "var(--data)" }}
      />
      LOADING…
    </div>
  );
}
