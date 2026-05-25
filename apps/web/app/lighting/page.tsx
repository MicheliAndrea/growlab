import { Power, SlidersHorizontal } from "lucide-react";
import { ModulePage } from "@/components/module-page";
import { Panel } from "@/components/ui/panel";

export default function LightingPage() {
  return (
    <ModulePage
      title="Lighting"
      subtitle="Shelly Dimmer 2 control is kept behind the API so every physical command can be logged."
      rows={[
        { label: "Provider", value: "Shelly", tone: "cyan" },
        { label: "Commands", value: "logged", tone: "green" },
        { label: "Schedules", value: "worker", tone: "amber" },
        { label: "Internet", value: "never", tone: "rose" }
      ]}
    >
      <Panel title="Controls">
        <div className="flex flex-wrap gap-2">
          <button className="focus-ring inline-flex h-10 items-center gap-2 rounded-md border border-[var(--border)] px-3 text-sm" type="button">
            <Power size={17} />
            On
          </button>
          <button className="focus-ring inline-flex h-10 items-center gap-2 rounded-md border border-[var(--border)] px-3 text-sm" type="button">
            <Power size={17} />
            Off
          </button>
          <label className="flex h-10 items-center gap-3 rounded-md border border-[var(--border)] px-3 text-sm">
            <SlidersHorizontal size={17} />
            <input className="accent-[var(--green)]" defaultValue={60} max={100} min={0} type="range" />
          </label>
        </div>
      </Panel>
    </ModulePage>
  );
}
