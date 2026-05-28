"use client";

import { ZoneForm } from "@/components/zones/zone-form";
import { DataPanel, PageHeader } from "@/components/dashboard/ui";

export default function NewZonePage() {
  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Zones"
        title="Create Zone"
        description="Add a grow space under an existing grow area."
      />
      <DataPanel title="Zone form" description="Core zone metadata.">
        <ZoneForm mode="create" />
      </DataPanel>
    </div>
  );
}
