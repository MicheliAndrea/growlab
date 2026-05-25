import { ImagePlus, Search } from "lucide-react";
import { Panel, StatusPill } from "@/components/ui/panel";
import { getPlants, getZones } from "@/lib/api-client";

export default async function PlantsPage() {
  const [plants, zones] = await Promise.all([getPlants(), getZones()]);
  const zoneName = new Map(zones.map((zone) => [zone.id, zone.name]));

  return (
    <div className="grid gap-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-2xl font-semibold">Plants</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">List, inspect, and prepare uploads for plant history.</p>
        </div>
        <button className="focus-ring inline-flex h-10 items-center gap-2 rounded-md bg-[var(--green)] px-3 text-sm font-medium text-[#0c130f]" type="button">
          <ImagePlus size={17} />
          Image
        </button>
      </div>

      <Panel>
        <label className="flex h-11 items-center gap-2 rounded-md border border-[var(--border)] px-3 text-sm text-[var(--muted)]">
          <Search size={17} />
          <input className="min-w-0 flex-1 bg-transparent text-[var(--text)] outline-none" placeholder="Search plants" />
        </label>
      </Panel>

      <Panel title="Plant records">
        <div className="grid gap-2">
          {plants.map((plant) => (
            <a className="grid gap-2 rounded-md border border-[var(--border)] p-3 hover:bg-[var(--surface-2)] sm:grid-cols-[1fr_auto]" href={`/plants/${plant.id}`} key={plant.id}>
              <div>
                <div className="font-medium">{plant.nickname}</div>
                <div className="mt-1 text-sm text-[var(--muted)]">{plant.zoneId ? zoneName.get(plant.zoneId) ?? "Unknown zone" : "No zone"}</div>
              </div>
              <StatusPill label={plant.status} tone="green" />
            </a>
          ))}
          {plants.length === 0 && <p className="text-sm text-[var(--muted)]">No plants yet.</p>}
        </div>
      </Panel>
    </div>
  );
}
