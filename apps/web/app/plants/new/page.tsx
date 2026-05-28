"use client";

import { useQuery } from "@tanstack/react-query";

import { DataNotice, DataPanel, PageHeader } from "@/components/dashboard/ui";
import { PlantForm } from "@/components/plants/plant-form";
import { fetchZones, queryKeys } from "@/lib/queries";

export default function NewPlantPage() {
  const zones = useQuery({
    queryKey: queryKeys.zones,
    queryFn: fetchZones,
  });

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Plants"
        title="Create Plant"
        description="Add a plant record and assign it to a zone."
      />
      <DataPanel title="Plant form" description="Core plant metadata.">
        {zones.isLoading ? <DataNotice state="loading" /> : null}
        {zones.isError ? <DataNotice state="error" /> : null}
        <PlantForm mode="create" zones={zones.data ?? []} />
      </DataPanel>
    </div>
  );
}
