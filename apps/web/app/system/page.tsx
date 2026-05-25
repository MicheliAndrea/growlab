import { ModulePage } from "@/components/module-page";

export default function SystemPage() {
  return (
    <ModulePage
      title="System"
      subtitle="Health view for API, PostgreSQL/TimescaleDB, Redis, EMQX, AI service, image volume, and Ollama."
      rows={[
        { label: "API", value: "health", tone: "green" },
        { label: "DB", value: "pg-01", tone: "cyan" },
        { label: "MQTT", value: "EMQX", tone: "cyan" },
        { label: "Ollama", value: "local", tone: "green" }
      ]}
    />
  );
}
