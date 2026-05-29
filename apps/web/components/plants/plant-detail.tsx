"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { RefreshCcw } from "lucide-react";

import { ImageGallery } from "@/components/images/image-gallery";
import { ImageUploadForm } from "@/components/images/image-upload-form";
import { PlantPhotoTimeline } from "@/components/images/plant-photo-timeline";
import { ExportButton } from "@/components/dashboard/export-button";
import { PlantEventForm } from "@/components/plants/plant-event-form";
import { PlantTaskForm } from "@/components/plants/plant-task-form";
import { Button } from "@/components/ui/button";
import {
  DataNotice,
  DataPanel,
  EmptyState,
  formatDateTime,
  PageHeader,
  Row,
  RowList,
  StatusBadge,
} from "@/components/dashboard/ui";
import {
  fetchPlant,
  fetchPlantEvents,
  fetchPlantImages,
  fetchPlantTasks,
  fetchPlantTimeline,
  fetchZones,
  queryKeys,
} from "@/lib/queries";

const poll = 30_000;

export function PlantDetail({ plantId }: { plantId: string }) {
  const queryClient = useQueryClient();
  const plant = useQuery({
    queryKey: queryKeys.plant(plantId),
    queryFn: () => fetchPlant(plantId),
    refetchInterval: poll,
  });
  const zones = useQuery({
    queryKey: queryKeys.zones,
    queryFn: fetchZones,
    refetchInterval: poll,
  });
  const timeline = useQuery({
    queryKey: queryKeys.plantTimeline(plantId),
    queryFn: () => fetchPlantTimeline(plantId),
    refetchInterval: poll,
  });
  const events = useQuery({
    queryKey: queryKeys.plantEvents(plantId),
    queryFn: () => fetchPlantEvents(plantId),
    refetchInterval: poll,
  });
  const images = useQuery({
    queryKey: queryKeys.plantImages(plantId),
    queryFn: () => fetchPlantImages(plantId),
    refetchInterval: poll,
  });
  const tasks = useQuery({
    queryKey: queryKeys.plantTasks(plantId),
    queryFn: () => fetchPlantTasks(plantId),
    refetchInterval: poll,
  });
  const zone = zones.data?.find((item) => item.id === plant.data?.zoneId);

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Plant detail"
        title={plant.data?.name ?? "Plant"}
        description="Timeline, manual events, checklist and health state."
      >
        <div className="flex flex-wrap gap-2">
          <ExportButton
            jsonFilename={`plant-passport-${plantId}.json`}
            csvFilename={`plant-passport-${plantId}.csv`}
            data={buildPlantPassport(
              plant.data,
              zone?.name,
              events.data,
              tasks.data,
              images.data,
            )}
            csvRows={[
              {
                id: plant.data?.id ?? "",
                name: plant.data?.name ?? "",
                zone: zone?.name ?? plant.data?.zoneId ?? "",
                health: plant.data?.currentHealthStatus ?? "",
                status: plant.data?.status ?? "",
                eventsCount: events.data?.length ?? 0,
                tasksCount: tasks.data?.length ?? 0,
                imagesCount: images.data?.length ?? 0,
              },
            ]}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => void queryClient.invalidateQueries()}
          >
            <RefreshCcw className="h-4 w-4" aria-hidden="true" />
            Refresh
          </Button>
          <Button asChild size="sm">
            <Link href={`/plants/${plantId}/edit`}>Edit</Link>
          </Button>
        </div>
      </PageHeader>

      {plant.isLoading ? <DataNotice state="loading" /> : null}
      {plant.isError ? <DataNotice state="error" /> : null}

      {plant.data ? (
        <section className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
          <DataPanel title="Properties" description="Plant record metadata.">
            <RowList>
              <Row
                title="Health"
                detail={plant.data.status}
                meta={<StatusBadge value={plant.data.currentHealthStatus} />}
              />
              <Row title="Code" detail={plant.data.code ?? "not set"} />
              <Row
                title="Zone"
                detail={zone?.name ?? plant.data.zoneId ?? "unassigned"}
              />
              <Row
                title="Planted"
                detail={formatDateTime(plant.data.plantedAt)}
              />
              <Row
                title="Acquired"
                detail={formatDateTime(plant.data.acquiredAt)}
              />
            </RowList>
          </DataPanel>

          <DataPanel
            title="Add event"
            description="Manual plant history entry."
          >
            <PlantEventForm plantId={plantId} />
          </DataPanel>
        </section>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <DataPanel title="Upload image" description="Store a plant image file.">
          <ImageUploadForm plantId={plantId} />
        </DataPanel>

        <DataPanel
          title="Gallery"
          description="Stored image metadata and files."
        >
          {images.isLoading ? <DataNotice state="loading" /> : null}
          {images.isError ? <DataNotice state="error" /> : null}
          {images.data ? (
            <ImageGallery
              images={images.data.map((image) => ({
                ...image,
                plantName: plant.data?.name,
              }))}
            />
          ) : null}
        </DataPanel>
      </section>

      <DataPanel
        title="Photo timeline"
        description="Chronological growth tracking metadata."
      >
        {images.isLoading ? <DataNotice state="loading" /> : null}
        {images.isError ? <DataNotice state="error" /> : null}
        {images.data ? (
          <PlantPhotoTimeline
            images={images.data.map((image) => ({
              ...image,
              plantName: plant.data?.name,
            }))}
            emptyTitle="No plant photos"
          />
        ) : null}
      </DataPanel>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <DataPanel
          title="Timeline"
          description="Events, tasks, images and health."
        >
          {timeline.isLoading ? <DataNotice state="loading" /> : null}
          {timeline.isError ? <DataNotice state="error" /> : null}
          {timeline.data && timeline.data.length > 0 ? (
            <RowList>
              {timeline.data.map((item) => (
                <Row
                  key={`${item.type}-${item.id}`}
                  title={item.title}
                  detail={item.description ?? formatDateTime(item.occurredAt)}
                  meta={<StatusBadge value={item.type} />}
                >
                  <span className="text-xs text-muted-foreground">
                    {formatDateTime(item.occurredAt)}
                  </span>
                </Row>
              ))}
            </RowList>
          ) : !timeline.isLoading && !timeline.isError ? (
            <EmptyState title="No timeline entries" />
          ) : null}
        </DataPanel>

        <DataPanel
          title="Manual events"
          description="Direct plant event records."
        >
          {events.isLoading ? <DataNotice state="loading" /> : null}
          {events.isError ? <DataNotice state="error" /> : null}
          {events.data && events.data.length > 0 ? (
            <RowList>
              {events.data.map((event) => (
                <Row
                  key={event.id}
                  title={event.eventType}
                  detail={event.notes ?? formatDateTime(event.occurredAt)}
                />
              ))}
            </RowList>
          ) : !events.isLoading && !events.isError ? (
            <EmptyState title="No manual events" />
          ) : null}
        </DataPanel>
      </section>

      <DataPanel title="Checklist" description="Manual plant tasks.">
        <div className="grid gap-4">
          <PlantTaskForm plantId={plantId} />

          {tasks.isLoading ? <DataNotice state="loading" /> : null}
          {tasks.isError ? <DataNotice state="error" /> : null}
          {tasks.data && tasks.data.length > 0 ? (
            <RowList>
              {tasks.data.map((task) => (
                <Row
                  key={task.id}
                  title={task.title}
                  detail={task.description ?? formatDateTime(task.dueAt)}
                  meta={<StatusBadge value={task.status} />}
                />
              ))}
            </RowList>
          ) : !tasks.isLoading && !tasks.isError ? (
            <EmptyState
              title="No manual tasks"
              detail="Add the first checklist item above."
            />
          ) : null}
        </div>
      </DataPanel>
    </div>
  );
}

function buildPlantPassport(
  plant:
    | {
        id: string;
        name: string;
        status: string;
        currentHealthStatus: string;
        zoneId?: string | null;
        plantedAt?: string | null;
        acquiredAt?: string | null;
      }
    | undefined,
  zoneName: string | undefined,
  events:
    | {
        id: string;
        eventType: string;
        occurredAt: string;
        notes?: string | null;
      }[]
    | undefined,
  tasks:
    | { id: string; title: string; status: string; dueAt?: string | null }[]
    | undefined,
  images:
    | {
        id: string;
        capturedAt?: string | null;
        growthStage?: string | null;
        tags?: string[];
      }[]
    | undefined,
) {
  if (!plant) {
    return {};
  }

  return {
    plant,
    zoneName: zoneName ?? null,
    summary: {
      eventsCount: events?.length ?? 0,
      openTasks: tasks?.filter((task) => task.status !== "done").length ?? 0,
      imagesCount: images?.length ?? 0,
    },
    events: events ?? [],
    tasks: tasks ?? [],
    images: images ?? [],
  };
}
