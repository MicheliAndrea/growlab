import { Cpu } from "lucide-react";
import { Panel, StatusPill } from "@/components/ui/panel";
import { getDevices } from "@/lib/api-client";

export default async function DevicesPage() {
  const devices = await getDevices();

  return (
    <div className="grid gap-5">
      <div>
        <h1 className="text-2xl font-semibold">Devices</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">ESP32 registry, heartbeat status, firmware version, config version, and telemetry entry point.</p>
      </div>
      <Panel title="Device records">
        <div className="grid gap-2">
          {devices.map((device) => (
            <a className="grid gap-2 rounded-md border border-[var(--border)] p-3 hover:bg-[var(--surface-2)] sm:grid-cols-[1fr_auto]" href={`/devices/${device.id}`} key={device.id}>
              <div className="flex items-center gap-3">
                <Cpu size={18} />
                <div>
                  <div className="font-medium">{device.name}</div>
                  <div className="mt-1 text-sm text-[var(--muted)]">{device.deviceUid}</div>
                </div>
              </div>
              <StatusPill label={device.status} tone={device.status === "online" ? "green" : "amber"} />
            </a>
          ))}
          {devices.length === 0 && <p className="text-sm text-[var(--muted)]">No devices yet.</p>}
        </div>
      </Panel>
    </div>
  );
}
