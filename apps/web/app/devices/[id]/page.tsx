import { ModulePage } from "@/components/module-page";

export default function DeviceDetailPage() {
  return (
    <ModulePage
      title="Device detail"
      subtitle="Device pages are prepared for heartbeat, config, sensors, recent telemetry, and OTA request flow."
      rows={[
        { label: "MQTT", value: "planned", tone: "amber" },
        { label: "Heartbeat", value: "required", tone: "cyan" },
        { label: "OTA", value: "prepared", tone: "green" },
        { label: "Pump relay", value: "off", tone: "rose" }
      ]}
    />
  );
}
