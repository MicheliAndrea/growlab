"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";

import { DataNotice, DataPanel, PageHeader } from "@/components/dashboard/ui";
import { PlantForm } from "@/components/plants/plant-form";
import { fetchPlant, fetchZones, queryKeys } from "@/lib/queries";

export default function EditPlantPage() {
  const { id } = useParams<{ id: string }>();
  const plant = useQuery({
    queryKey: queryKeys.plant(id),
    queryFn: () => fetchPlant(id),
  });
  const zones = useQuery({
    queryKey: queryKeys.zones,
    queryFn: fetchZones,
  });

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Plants"
        title="Edit Plant"
        description="Update plant assignment and manual health state."
      />
      <DataPanel title="Plant form" description="Core plant metadata.">
        {plant.isLoading || zones.isLoading ? (
          <DataNotice state="loading" />
        ) : null}
        {plant.isError || zones.isError ? <DataNotice state="error" /> : null}
        {plant.data ? (
          <PlantForm
            mode="edit"
            initialPlant={plant.data}
            zones={zones.data ?? []}
          />
        ) : null}
      </DataPanel>
    </div>
  );
}
