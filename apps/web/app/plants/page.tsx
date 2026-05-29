"use client";

import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckSquare, Leaf, RefreshCcw } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  DataNotice,
  DataPanel,
  EmptyState,
  formatDateTime,
  MetricCard,
  PageHeader,
  Row,
  RowList,
  StatusBadge,
} from "@/components/dashboard/ui";
import { ExportButton } from "@/components/dashboard/export-button";
import {
  fetchPlantCategories,
  fetchPlantFamilies,
  fetchPlants,
  fetchPlantSpecies,
  fetchPlantTasks,
  queryKeys,
} from "@/lib/queries";

const poll = 30_000;

export default function PlantsPage() {
  const queryClient = useQueryClient();
  const plants = useQuery({
    queryKey: queryKeys.plants,
    queryFn: fetchPlants,
    refetchInterval: poll,
  });
  const families = useQuery({
    queryKey: queryKeys.plantFamilies,
    queryFn: fetchPlantFamilies,
  });
  const categories = useQuery({
    queryKey: queryKeys.plantCategories,
    queryFn: fetchPlantCategories,
  });
  const species = useQuery({
    queryKey: queryKeys.plantSpecies,
    queryFn: fetchPlantSpecies,
  });
  const taskQueries = useQueries({
    queries: (plants.data ?? []).map((plant) => ({
      queryKey: queryKeys.plantTasks(plant.id),
      queryFn: () => fetchPlantTasks(plant.id),
      refetchInterval: poll,
    })),
  });

  const openTasks = taskQueries.reduce((count, query) => {
    return (
      count + (query.data ?? []).filter((task) => task.status !== "done").length
    );
  }, 0);
  const healthyPlants =
    plants.data?.filter((plant) => plant.currentHealthStatus === "healthy")
      .length ?? 0;

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Plants"
        title="Plant Inventory"
        description="Tracked plants, manual health state and checklist load."
      >
        <div className="flex flex-wrap gap-2">
          <ExportButton
            jsonFilename="plants.json"
            csvFilename="plants.csv"
            data={plants.data ?? []}
            csvRows={(plants.data ?? []).map((plant) => ({
              id: plant.id,
              name: plant.name,
              zoneId: plant.zoneId ?? "",
              status: plant.status,
              currentHealthStatus: plant.currentHealthStatus,
              plantedAt: plant.plantedAt,
              acquiredAt: plant.acquiredAt ?? "",
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
          <Button asChild size="sm">
            <Link href="/plants/new">New plant</Link>
          </Button>
        </div>
      </PageHeader>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Plants"
          value={plants.data?.length ?? 0}
          detail="Inventory records"
          icon={Leaf}
        />
        <MetricCard
          title="Healthy"
          value={healthyPlants}
          detail="Manual health state"
          icon={Leaf}
          tone={healthyPlants > 0 ? "success" : "secondary"}
        />
        <MetricCard
          title="Open tasks"
          value={openTasks}
          detail="Manual checklist"
          icon={CheckSquare}
          tone={openTasks > 0 ? "warning" : "success"}
        />
        <MetricCard
          title="Task sources"
          value={taskQueries.length}
          detail="Plants queried for tasks"
          icon={CheckSquare}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
        <DataPanel title="Plants" description="Current plant records.">
          {plants.isLoading ? <DataNotice state="loading" /> : null}
          {plants.isError ? <DataNotice state="error" /> : null}
          {plants.data && plants.data.length > 0 ? (
            <RowList>
              {plants.data.map((plant) => (
                <Row
                  key={plant.id}
                  title={plant.name}
                  detail={
                    plant.zoneId
                      ? `Zone ${plant.zoneId}`
                      : `Planted ${formatDateTime(plant.plantedAt)}`
                  }
                  meta={<StatusBadge value={plant.currentHealthStatus} />}
                >
                  <StatusBadge value={plant.status} />
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/plants/${plant.id}`}>Open</Link>
                  </Button>
                  <Button asChild size="sm" variant="ghost">
                    <Link href={`/plants/${plant.id}/edit`}>Edit</Link>
                  </Button>
                </Row>
              ))}
            </RowList>
          ) : !plants.isLoading && !plants.isError ? (
            <EmptyState title="No plants" />
          ) : null}
        </DataPanel>

        <DataPanel title="Manual tasks" description="Open checklist items.">
          {taskQueries.some((query) => query.isLoading) ? (
            <DataNotice state="loading" />
          ) : null}
          {openTasks === 0 && !taskQueries.some((query) => query.isLoading) ? (
            <EmptyState title="No open tasks" />
          ) : null}
          {openTasks > 0 ? (
            <RowList>
              {taskQueries.flatMap((query, index) =>
                (query.data ?? [])
                  .filter((task) => task.status !== "done")
                  .slice(0, 4)
                  .map((task) => (
                    <Row
                      key={task.id}
                      title={task.title}
                      detail={
                        plants.data?.[index]
                          ? plants.data[index].name
                          : formatDateTime(task.dueAt)
                      }
                      meta={<StatusBadge value={task.status} />}
                    />
                  )),
              )}
            </RowList>
          ) : null}
        </DataPanel>
      </section>

      <DataPanel title="Plant wiki" description="Local catalog coverage.">
        {families.isLoading || categories.isLoading || species.isLoading ? (
          <DataNotice state="loading" />
        ) : null}
        {families.isError || categories.isError || species.isError ? (
          <DataNotice state="error" />
        ) : null}
        <RowList>
          <Row
            title="Families"
            detail="Scientific family records"
            meta={<StatusBadge value={`${families.data?.length ?? 0}`} />}
          />
          <Row
            title="Categories"
            detail="Plant category records"
            meta={<StatusBadge value={`${categories.data?.length ?? 0}`} />}
          />
          <Row
            title="Species"
            detail="Species and cultivar records"
            meta={<StatusBadge value={`${species.data?.length ?? 0}`} />}
          />
        </RowList>
      </DataPanel>
    </div>
  );
}
