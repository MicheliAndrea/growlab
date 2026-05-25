import { ModulePage } from "@/components/module-page";

export default function AiAnalysisPage() {
  return (
    <ModulePage
      title="AI analysis"
      subtitle="Local Ollama vision analysis returns structured observations and suggestions. AI never executes device commands."
      rows={[
        { label: "Mode", value: "advisory", tone: "cyan" },
        { label: "Default", value: "qwen2.5vl", tone: "green" },
        { label: "Confidence", value: "required", tone: "green" },
        { label: "Actions", value: "blocked", tone: "rose" }
      ]}
    />
  );
}
