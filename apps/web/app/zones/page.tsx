"use client";

import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { Boxes, RefreshCcw, SlidersHorizontal } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
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
import { fetchZoneProfiles, fetchZones, queryKeys } from "@/lib/queries";

const poll = 30_000;

export default function ZonesPage() {
  const queryClient = useQueryClient();
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

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Zones"
        title="Zone Targets"
        description="Grow spaces and attached target profiles."
      >
        <div className="flex flex-wrap gap-2">
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

      <section className="grid gap-3 md:grid-cols-3">
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
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <DataPanel title="Zones" description="Environment grouping.">
          {zones.isLoading ? <DataNotice state="loading" /> : null}
          {zones.isError ? <DataNotice state="error" /> : null}
          {zones.data && zones.data.length > 0 ? (
            <RowList>
              {zones.data.map((zone) => (
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
          ) : !zones.isLoading && !zones.isError ? (
            <EmptyState title="No zones" />
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
          {profileCount > 0 ? (
            <RowList>
              {profileQueries.flatMap((query, index) =>
                (query.data ?? []).map((profile) => (
                  <Row
                    key={profile.id}
                    title={profile.name}
                    detail={zones.data?.[index]?.name}
                    meta={
                      <StatusBadge
                        value={profile.isActive ? "active" : "inactive"}
                      />
                    }
                  />
                )),
              )}
            </RowList>
          ) : null}
        </DataPanel>
      </section>
    </div>
  );
}
