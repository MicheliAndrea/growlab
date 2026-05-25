import { ImagePlus } from "lucide-react";
import { ModulePage } from "@/components/module-page";
import { Panel } from "@/components/ui/panel";

export default function PlantDetailPage({ params }: Readonly<{ params: Promise<{ id: string }> }>) {
  return (
    <ModulePage
      title="Plant detail"
      subtitle="Timeline, gallery, notes, and AI analysis are loaded from the API by plant id."
      rows={[
        { label: "Timeline", value: "ready", tone: "green" },
        { label: "Gallery", value: "ready", tone: "green" },
        { label: "AI", value: "advisory", tone: "cyan" },
        { label: "Actions", value: "manual", tone: "amber" }
      ]}
    >
      <Panel
        title="Image upload"
        action={
          <button className="focus-ring inline-flex h-9 items-center gap-2 rounded-md border border-[var(--border)] px-3 text-sm" type="button">
            <ImagePlus size={16} />
            Select
          </button>
        }
      >
        <p className="text-sm text-[var(--muted)]">Use POST /api/plants/:id/images with multipart/form-data field file. The API stores image files on disk, not in PostgreSQL.</p>
      </Panel>
    </ModulePage>
  );
}
