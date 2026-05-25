import { ModulePage } from "@/components/module-page";

export default function FirmwarePage() {
  return (
    <ModulePage
      title="Firmware"
      subtitle="ESP32 firmware versions, channels, checksums, and OTA jobs are prepared without automatic updates."
      rows={[
        { label: "Channels", value: "dev beta stable", tone: "cyan" },
        { label: "Checksum", value: "required", tone: "green" },
        { label: "Auto update", value: "off", tone: "rose" },
        { label: "Status", value: "tracked", tone: "amber" }
      ]}
    />
  );
}
