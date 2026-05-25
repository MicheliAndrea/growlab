import { Panel, StatusPill } from "@/components/ui/panel";
import { getZones } from "@/lib/api-client";

export default async function ZonesPage() {
  const zones = await getZones();

  return (
    <div className="grid gap-5">
      <div>
        <h1 className="text-2xl font-semibold">Zones</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">Logical grow areas that group plants, sensors, lighting, and future irrigation.</p>
      </div>
      <Panel title="Zone records">
        <div className="grid gap-2">
          {zones.map((zone) => (
            <a className="grid gap-2 rounded-md border border-[var(--border)] p-3 hover:bg-[var(--surface-2)] sm:grid-cols-[1fr_auto]" href={`/zones/${zone.id}`} key={zone.id}>
              <div>
                <div className="font-medium">{zone.name}</div>
                <div className="mt-1 text-sm text-[var(--muted)]">{zone.description ?? zone.position ?? "No description"}</div>
              </div>
              <StatusPill label="configured" tone="cyan" />
            </a>
          ))}
          {zones.length === 0 && <p className="text-sm text-[var(--muted)]">No zones returned by the API.</p>}
        </div>
      </Panel>
    </div>
  );
}
