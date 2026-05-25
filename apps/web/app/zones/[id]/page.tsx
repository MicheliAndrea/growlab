import { ModulePage } from "@/components/module-page";

export default function ZoneDetailPage() {
  return (
    <ModulePage
      title="Zone detail"
      subtitle="Zone detail coordinates plants, sensors, Shelly light state, target environment, and irrigation read-only state."
      rows={[
        { label: "Plants", value: "linked", tone: "green" },
        { label: "Sensors", value: "planned", tone: "amber" },
        { label: "Lighting", value: "Shelly", tone: "cyan" },
        { label: "Irrigation", value: "disabled", tone: "rose" }
      ]}
    />
  );
}
