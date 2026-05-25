import { Panel, StatusPill } from "@/components/ui/panel";

type Row = {
  label: string;
  value: string;
  tone?: "default" | "green" | "amber" | "rose" | "cyan";
};

export function ModulePage({
  title,
  subtitle,
  rows,
  children
}: Readonly<{
  title: string;
  subtitle: string;
  rows: Row[];
  children?: React.ReactNode;
}>) {
  return (
    <div className="grid gap-5">
      <div>
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="mt-1 max-w-3xl text-sm text-[var(--muted)]">{subtitle}</p>
      </div>
      <Panel>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {rows.map((row) => (
            <div className="flex items-center justify-between gap-3 rounded-md border border-[var(--border)] px-3 py-3" key={row.label}>
              <span className="text-sm text-[var(--muted)]">{row.label}</span>
              <StatusPill label={row.value} tone={row.tone} />
            </div>
          ))}
        </div>
      </Panel>
      {children}
    </div>
  );
}
