import type { ReactNode } from "react";

export function Panel({ children, title, action }: Readonly<{ children: ReactNode; title?: string; action?: ReactNode }>) {
  return (
    <section className="rounded-md border border-[var(--border)] bg-[var(--surface)]">
      {(title || action) && (
        <div className="flex min-h-12 items-center justify-between gap-3 border-b border-[var(--border)] px-4">
          {title ? <h2 className="text-sm font-semibold">{title}</h2> : <span />}
          {action}
        </div>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

export function Metric({ label, value, tone = "default" }: Readonly<{ label: string; value: string; tone?: "default" | "green" | "cyan" | "amber" | "rose" }>) {
  const color = {
    default: "text-[var(--text)]",
    green: "text-[var(--green)]",
    cyan: "text-[var(--cyan)]",
    amber: "text-[var(--amber)]",
    rose: "text-[var(--rose)]"
  }[tone];

  return (
    <div className="rounded-md border border-[var(--border)] bg-[rgba(255,255,255,0.02)] p-4">
      <div className="text-xs uppercase text-[var(--muted)]">{label}</div>
      <div className={`mt-2 text-2xl font-semibold ${color}`}>{value}</div>
    </div>
  );
}

export function StatusPill({ label, tone = "default" }: Readonly<{ label: string; tone?: "default" | "green" | "amber" | "rose" | "cyan" }>) {
  const styles = {
    default: "border-[var(--border)] text-[var(--muted)]",
    green: "border-[rgba(98,186,123,0.5)] text-[var(--green)]",
    amber: "border-[rgba(223,177,95,0.5)] text-[var(--amber)]",
    rose: "border-[rgba(228,122,122,0.5)] text-[var(--rose)]",
    cyan: "border-[rgba(113,199,201,0.5)] text-[var(--cyan)]"
  }[tone];

  return <span className={`inline-flex h-7 items-center rounded-md border px-2 text-xs ${styles}`}>{label}</span>;
}
