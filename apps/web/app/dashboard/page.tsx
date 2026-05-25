import { Cpu, Leaf, Lightbulb, Map } from "lucide-react";
import { Panel, Metric, StatusPill } from "@/components/ui/panel";
import { getDevices, getHealth, getLighting, getPlants, getZones } from "@/lib/api-client";

export default async function DashboardPage() {
  const [health, zones, plants, devices] = await Promise.all([getHealth(), getZones(), getPlants(), getDevices()]);
  const lighting = zones[0] ? await getLighting(zones[0].id) : [];
  const onlineDevices = devices.filter((device) => device.status === "online").length;

  return (
    <div className="grid gap-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">Operational view for plants, zones, ESP32 nodes, light state, AI, and safety flags.</p>
        </div>
        <StatusPill label={health.status} tone={health.status === "healthy" ? "green" : "rose"} />
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Zones" value={String(zones.length)} tone="cyan" />
        <Metric label="Plants" value={String(plants.length)} tone="green" />
        <Metric label="Devices online" value={`${onlineDevices}/${devices.length}`} tone={onlineDevices ? "green" : "amber"} />
        <Metric label="Lights" value={String(lighting.length)} tone="amber" />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <Panel title="Recent plants">
          <div className="grid gap-2">
            {plants.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">No plants returned by the API yet.</p>
            ) : (
              plants.slice(0, 6).map((plant) => (
                <a className="flex items-center justify-between rounded-md border border-[var(--border)] px-3 py-3 hover:bg-[var(--surface-2)]" href={`/plants/${plant.id}`} key={plant.id}>
                  <span className="flex items-center gap-2 text-sm">
                    <Leaf size={16} />
                    {plant.nickname}
                  </span>
                  <StatusPill label={plant.status} tone="green" />
                </a>
              ))
            )}
          </div>
        </Panel>

        <Panel title="System scope">
          <div className="grid gap-3">
            <SystemRow icon={<Map size={16} />} label="Access" value="LAN/VPN only" />
            <SystemRow icon={<Cpu size={16} />} label="Irrigation manual" value={health.features.irrigationManualControl ? "enabled" : "disabled"} />
            <SystemRow icon={<Lightbulb size={16} />} label="Shelly lighting" value={health.features.shellyLighting ? "enabled" : "disabled"} />
            <SystemRow icon={<Leaf size={16} />} label="AI can execute" value={health.features.aiCanExecuteActions ? "enabled" : "disabled"} />
          </div>
        </Panel>
      </section>
    </div>
  );
}

function SystemRow({ icon, label, value }: Readonly<{ icon: React.ReactNode; label: string; value: string }>) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-[var(--border)] px-3 py-3 text-sm">
      <span className="flex items-center gap-2 text-[var(--muted)]">
        {icon}
        {label}
      </span>
      <span>{value}</span>
    </div>
  );
}
