import { ModulePage } from "@/components/module-page";

export default function SettingsPage() {
  return (
    <ModulePage
      title="Settings"
      subtitle="Feature flags and integration endpoints are read from environment variables so secrets stay out of the repository."
      rows={[
        { label: "Auth", value: "future", tone: "amber" },
        { label: "Irrigation", value: "disabled", tone: "rose" },
        { label: "AI actions", value: "disabled", tone: "rose" },
        { label: "Secrets", value: "env", tone: "green" }
      ]}
    />
  );
}
