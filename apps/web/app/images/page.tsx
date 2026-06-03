"use client";

import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, HardDrive, Image, RefreshCcw, Sprout } from "lucide-react";
import { useMemo } from "react";

import { ImageGallery } from "@/components/images/image-gallery";
import { ImageMetadataPanel } from "@/components/images/image-metadata-panel";
import { PlantPhotoTimeline } from "@/components/images/plant-photo-timeline";
import { Button } from "@/components/ui/button";
import {
  ListFilterBar,
  SearchFilter,
  SelectFilter,
  type FilterOption,
  uniqueFilterOptions,
} from "@/components/dashboard/list-filters";
import {
  DataNotice,
  DataPanel,
  MetricCard,
  PageHeader,
} from "@/components/dashboard/ui";
import { ExportButton } from "@/components/dashboard/export-button";
import { fetchPlantImages, fetchPlants, queryKeys } from "@/lib/queries";
import { usePersistentStringState } from "@/lib/persistent-state";

const poll = 30_000;

export default function ImagesPage() {
  const queryClient = useQueryClient();
  const [imageSearch, setImageSearch] = usePersistentStringState(
    "images.search",
    "",
  );
  const [plantFilter, setPlantFilter] = usePersistentStringState(
    "images.plant",
    "all",
  );
  const [growthStageFilter, setGrowthStageFilter] = usePersistentStringState(
    "images.growthStage",
    "all",
  );
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
  const plantOptions = useMemo<FilterOption[]>(() => {
    const entries = Array.from(
      new Map(
        images.map((image) => [
          image.plantId,
          image.plantName ?? image.plantId,
        ]),
      ).entries(),
    ).sort((first, second) => first[1].localeCompare(second[1]));

    return [
      { label: "All plants", value: "all" },
      ...entries.map(([value, label]) => ({ label, value })),
    ];
  }, [images]);
  const growthStageOptions = useMemo(
    () =>
      uniqueFilterOptions(
        images.map((image) => image.growthStage),
        "All growth stages",
      ),
    [images],
  );
  const filteredImages = useMemo(() => {
    const search = imageSearch.trim().toLowerCase();

    return images.filter((image) => {
      const matchesSearch =
        search.length === 0 ||
        [
          image.plantName,
          image.originalFilename,
          image.growthStage,
          image.zoneId,
          ...(image.tags ?? []),
        ].some((value) => value?.toLowerCase().includes(search));
      const matchesPlant =
        plantFilter === "all" || image.plantId === plantFilter;
      const matchesGrowthStage =
        growthStageFilter === "all" || image.growthStage === growthStageFilter;

      return matchesSearch && matchesPlant && matchesGrowthStage;
    });
  }, [growthStageFilter, imageSearch, images, plantFilter]);
  const growthStageCount = filteredImages.filter(
    (image) => image.growthStage,
  ).length;
  const storedBytes = filteredImages.reduce(
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
        <div className="flex flex-wrap gap-2">
          <ExportButton
            jsonFilename="plant-images.json"
            csvFilename="plant-images.csv"
            data={filteredImages}
            csvRows={filteredImages.map((image) => ({
              id: image.id,
              plantId: image.plantId,
              plantName: image.plantName ?? "",
              zoneId: image.zoneId ?? "",
              growthStage: image.growthStage ?? "",
              capturedAt: image.capturedAt ?? "",
              uploadedAt: image.uploadedAt,
              tags: (image.tags ?? []).join(";"),
              sizeBytes: image.sizeBytes ?? 0,
            }))}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => void queryClient.invalidateQueries()}
          >
            <RefreshCcw className="h-4 w-4" aria-hidden="true" />
            Refresh
          </Button>
        </div>
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
          value={filteredImages.length}
          detail="Visible image files"
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
        <ListFilterBar
          hasActiveFilters={
            imageSearch !== "" ||
            plantFilter !== "all" ||
            growthStageFilter !== "all"
          }
          onReset={() => {
            setImageSearch("");
            setPlantFilter("all");
            setGrowthStageFilter("all");
          }}
          resultCount={filteredImages.length}
          totalCount={images.length}
        >
          <SearchFilter
            label="Search images"
            placeholder="Search images"
            value={imageSearch}
            onValueChange={setImageSearch}
          />
          <SelectFilter
            label="Filter image plant"
            value={plantFilter}
            onValueChange={setPlantFilter}
            options={plantOptions}
          />
          <SelectFilter
            label="Filter growth stage"
            value={growthStageFilter}
            onValueChange={setGrowthStageFilter}
            options={growthStageOptions}
          />
        </ListFilterBar>
        {plants.isLoading || imageQueries.some((query) => query.isLoading) ? (
          <DataNotice state="loading" />
        ) : null}
        {plants.isError || imageQueries.some((query) => query.isError) ? (
          <DataNotice state="error" />
        ) : null}
        {!plants.isLoading && !imageQueries.some((query) => query.isLoading) ? (
          <ImageGallery images={filteredImages} />
        ) : null}
      </DataPanel>

      <DataPanel
        title="Growth metadata"
        description="Manual growth-stage, tags and tracking metadata."
      >
        {plants.isLoading || imageQueries.some((query) => query.isLoading) ? (
          <DataNotice state="loading" />
        ) : null}
        {plants.isError || imageQueries.some((query) => query.isError) ? (
          <DataNotice state="error" />
        ) : null}
        {!plants.isLoading && !imageQueries.some((query) => query.isLoading) ? (
          <ImageMetadataPanel images={filteredImages} />
        ) : null}
      </DataPanel>

      <DataPanel
        title="Photo timeline"
        description="Latest images ordered by capture time."
      >
        {plants.isLoading || imageQueries.some((query) => query.isLoading) ? (
          <DataNotice state="loading" />
        ) : null}
        {plants.isError || imageQueries.some((query) => query.isError) ? (
          <DataNotice state="error" />
        ) : null}
        {!plants.isLoading && !imageQueries.some((query) => query.isLoading) ? (
          <PlantPhotoTimeline images={filteredImages} />
        ) : null}
      </DataPanel>
    </div>
  );
}
