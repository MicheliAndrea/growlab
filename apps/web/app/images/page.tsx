"use client";

import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, HardDrive, Image, RefreshCcw, Sprout } from "lucide-react";

import { ImageGallery } from "@/components/images/image-gallery";
import { Button } from "@/components/ui/button";
import {
  DataNotice,
  DataPanel,
  MetricCard,
  PageHeader,
} from "@/components/dashboard/ui";
import { fetchPlantImages, fetchPlants, queryKeys } from "@/lib/queries";

const poll = 30_000;

export default function ImagesPage() {
  const queryClient = useQueryClient();
  const plants = useQuery({
    queryKey: queryKeys.plants,
    queryFn: fetchPlants,
    refetchInterval: poll,
  });
  const imageQueries = useQueries({
    queries: (plants.data ?? []).map((plant) => ({
      queryKey: queryKeys.plantImages(plant.id),
      queryFn: () => fetchPlantImages(plant.id),
      refetchInterval: poll,
    })),
  });

  const images = imageQueries.flatMap((query, index) =>
    (query.data ?? []).map((image) => ({
      ...image,
      plantName: plants.data?.[index]?.name ?? "Plant",
    })),
  );
  const growthStageCount = images.filter((image) => image.growthStage).length;
  const storedBytes = images.reduce(
    (total, image) => total + (image.sizeBytes ?? 0),
    0,
  );

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Images"
        title="Plant Gallery"
        description="Uploaded plant images, growth-stage metadata and tags."
      >
        <Button
          variant="outline"
          size="sm"
          onClick={() => void queryClient.invalidateQueries()}
        >
          <RefreshCcw className="h-4 w-4" aria-hidden="true" />
          Refresh
        </Button>
      </PageHeader>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Plants scanned"
          value={plants.data?.length ?? 0}
          detail="Image sources"
          icon={Sprout}
        />
        <MetricCard
          title="Images"
          value={images.length}
          detail="Stored image files"
          icon={Image}
        />
        <MetricCard
          title="Growth stages"
          value={growthStageCount}
          detail="Entries with stage metadata"
          icon={Camera}
        />
        <MetricCard
          title="Storage"
          value={`${Math.round(storedBytes / 1024)} KB`}
          detail="Metadata reported size"
          icon={HardDrive}
        />
      </section>

      <DataPanel title="Gallery" description="Files served by the GrowLab API.">
        {plants.isLoading || imageQueries.some((query) => query.isLoading) ? (
          <DataNotice state="loading" />
        ) : null}
        {plants.isError || imageQueries.some((query) => query.isError) ? (
          <DataNotice state="error" />
        ) : null}
        {!plants.isLoading && !imageQueries.some((query) => query.isLoading) ? (
          <ImageGallery images={images} />
        ) : null}
      </DataPanel>
    </div>
  );
}
