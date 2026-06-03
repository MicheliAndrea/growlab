"use client";

import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { Boxes, RefreshCcw, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import {
  ListFilterBar,
  SearchFilter,
  SelectFilter,
  uniqueFilterOptions,
} from "@/components/dashboard/list-filters";
import {
  DataNotice,
  DataPanel,
  EmptyState,
  MetricCard,
  PageHeader,
  Row,
  RowList,
  StatusBadge,
} from "@/components/dashboard/ui";
import { ExportButton } from "@/components/dashboard/export-button";
import { fetchZoneProfiles, fetchZones, queryKeys } from "@/lib/queries";
import { usePersistentStringState } from "@/lib/persistent-state";

const poll = 30_000;

export default function ZonesPage() {
  const queryClient = useQueryClient();
  const [zoneSearch, setZoneSearch] = usePersistentStringState(
    "zones.search",
    "",
  );
  const [environmentFilter, setEnvironmentFilter] = usePersistentStringState(
    "zones.environment",
    "all",
  );
  const zones = useQuery({
    queryKey: queryKeys.zones,
    queryFn: fetchZones,
    refetchInterval: poll,
  });
  const profileQueries = useQueries({
    queries: (zones.data ?? []).map((zone) => ({
      queryKey: queryKeys.zoneProfiles(zone.id),
      queryFn: () => fetchZoneProfiles(zone.id),
      refetchInterval: poll,
    })),
  });

  const profileCount = profileQueries.reduce(
    (count, query) => count + (query.data?.length ?? 0),
    0,
  );
  const activeProfileCount = profileQueries.reduce(
    (count, query) =>
      count + (query.data ?? []).filter((profile) => profile.isActive).length,
    0,
  );
  const environmentOptions = useMemo(
    () =>
      uniqueFilterOptions(
        (zones.data ?? []).map((zone) => zone.environmentType),
        "All environments",
      ),
    [zones.data],
  );
  const filteredZones = useMemo(() => {
    const search = zoneSearch.trim().toLowerCase();

    return (zones.data ?? []).filter((zone) => {
      const matchesSearch =
        search.length === 0 ||
        [zone.name, zone.slug, zone.environmentType, zone.description].some(
          (value) => value?.toLowerCase().includes(search),
        );
      const matchesEnvironment =
        environmentFilter === "all" ||
        zone.environmentType === environmentFilter;

      return matchesSearch && matchesEnvironment;
    });
  }, [environmentFilter, zoneSearch, zones.data]);
  const visibleZoneIds = new Set(filteredZones.map((zone) => zone.id));
  const visibleProfileRows = profileQueries.flatMap((query, index) => {
    const zone = zones.data?.[index];

    if (!zone || !visibleZoneIds.has(zone.id)) {
      return [];
    }

    return (query.data ?? []).map((profile) => ({ profile, zone }));
  });

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Zones"
        title="Zone Targets"
        description="Grow spaces and attached target profiles."
      >
        <div className="flex flex-wrap gap-2">
          <ExportButton
            jsonFilename="zones.json"
            csvFilename="zones.csv"
            data={filteredZones}
            csvRows={filteredZones.map((zone) => ({
              id: zone.id,
              name: zone.name,
              slug: zone.slug,
              environmentType: zone.environmentType,
              growAreaId: zone.growAreaId,
              updatedAt: zone.updatedAt,
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
            <Link href="/zones/new">New zone</Link>
          </Button>
        </div>
      </PageHeader>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Zones"
          value={zones.data?.length ?? 0}
          detail="Configured spaces"
          icon={Boxes}
        />
        <MetricCard
          title="Profiles"
          value={profileCount}
          detail="Target profile records"
          icon={SlidersHorizontal}
        />
        <MetricCard
          title="Active profiles"
          value={activeProfileCount}
          detail="Applied target profiles"
          icon={SlidersHorizontal}
          tone={activeProfileCount > 0 ? "success" : "secondary"}
        />
        <MetricCard
          title="Visible"
          value={filteredZones.length}
          detail="After list filters"
          icon={Boxes}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <DataPanel title="Zones" description="Environment grouping.">
          <ListFilterBar
            hasActiveFilters={zoneSearch !== "" || environmentFilter !== "all"}
            onReset={() => {
              setZoneSearch("");
              setEnvironmentFilter("all");
            }}
            resultCount={filteredZones.length}
            totalCount={zones.data?.length ?? 0}
          >
            <SearchFilter
              label="Search zones"
              placeholder="Search zones"
              value={zoneSearch}
              onValueChange={setZoneSearch}
            />
            <SelectFilter
              label="Filter environment"
              value={environmentFilter}
              onValueChange={setEnvironmentFilter}
              options={environmentOptions}
            />
          </ListFilterBar>
          {zones.isLoading ? <DataNotice state="loading" /> : null}
          {zones.isError ? <DataNotice state="error" /> : null}
          {filteredZones.length > 0 ? (
            <RowList>
              {filteredZones.map((zone) => (
                <Row
                  key={zone.id}
                  title={zone.name}
                  detail={zone.description ?? zone.environmentType}
                  meta={<StatusBadge value={zone.environmentType} />}
                >
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/zones/${zone.id}`}>Open</Link>
                  </Button>
                  <Button asChild size="sm" variant="ghost">
                    <Link href={`/zones/${zone.id}/edit`}>Edit</Link>
                  </Button>
                </Row>
              ))}
            </RowList>
          ) : !zones.isLoading && !zones.isError && zones.data ? (
            <EmptyState
              title={zones.data.length > 0 ? "No matching zones" : "No zones"}
            />
          ) : null}
        </DataPanel>

        <DataPanel title="Target profiles" description="Zone target metadata.">
          {profileQueries.some((query) => query.isLoading) ? (
            <DataNotice state="loading" />
          ) : null}
          {profileCount === 0 &&
          !profileQueries.some((query) => query.isLoading) ? (
            <EmptyState title="No zone profiles" />
          ) : null}
          {profileCount > 0 && visibleProfileRows.length === 0 ? (
            <EmptyState title="No profiles for visible zones" />
          ) : null}
          {visibleProfileRows.length > 0 ? (
            <RowList>
              {visibleProfileRows.map(({ profile, zone }) => (
                <Row
                  key={profile.id}
                  title={profile.name}
                  detail={zone.name}
                  meta={
                    <StatusBadge
                      value={profile.isActive ? "active" : "inactive"}
                    />
                  }
                />
              ))}
            </RowList>
          ) : null}
        </DataPanel>
      </section>
    </div>
  );
}
