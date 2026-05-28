"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";

import { DataNotice, DataPanel, PageHeader } from "@/components/dashboard/ui";
import { ZoneForm } from "@/components/zones/zone-form";
import { fetchZone, queryKeys } from "@/lib/queries";

export default function EditZonePage() {
  const { id } = useParams<{ id: string }>();
  const zone = useQuery({
    queryKey: queryKeys.zone(id),
    queryFn: () => fetchZone(id),
  });

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Zones"
        title="Edit Zone"
        description="Update zone metadata and environment assignment."
      />
      <DataPanel title="Zone form" description="Core zone metadata.">
        {zone.isLoading ? <DataNotice state="loading" /> : null}
        {zone.isError ? <DataNotice state="error" /> : null}
        {zone.data ? <ZoneForm mode="edit" initialZone={zone.data} /> : null}
      </DataPanel>
    </div>
  );
}
