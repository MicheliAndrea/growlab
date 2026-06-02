"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { RefreshCcw } from "lucide-react";

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
import { ZoneProfileForm } from "@/components/zones/zone-profile-form";
import { ZoneLayoutEditor } from "@/components/zones/zone-layout-editor";
import { ZoneLayoutPreview } from "@/components/zones/zone-layout-preview";
import {
  activateZoneProfileEntry,
  fetchPlantsByZone,
  fetchZone,
  fetchZoneProfiles,
  queryKeys,
} from "@/lib/queries";

const poll = 30_000;

export function ZoneDetail({ zoneId }: { zoneId: string }) {
  const queryClient = useQueryClient();
  const zone = useQuery({
    queryKey: queryKeys.zone(zoneId),
    queryFn: () => fetchZone(zoneId),
    refetchInterval: poll,
  });
  const profiles = useQuery({
    queryKey: queryKeys.zoneProfiles(zoneId),
    queryFn: () => fetchZoneProfiles(zoneId),
    refetchInterval: poll,
  });
  const plants = useQuery({
    queryKey: queryKeys.plantsByZone(zoneId),
    queryFn: () => fetchPlantsByZone(zoneId),
    refetchInterval: poll,
  });
  const activateProfileMutation = useMutation({
    mutationFn: (profileId: string) =>
      activateZoneProfileEntry(zoneId, profileId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.zoneProfiles(zoneId),
      });
    },
  });

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Zone detail"
        title={zone.data?.name ?? "Zone"}
        description={
          zone.data?.description ?? "Zone targets and assigned plants."
        }
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
            <Link href={`/zones/${zoneId}/edit`}>Edit</Link>
          </Button>
        </div>
      </PageHeader>

      {zone.isLoading ? <DataNotice state="loading" /> : null}
      {zone.isError ? <DataNotice state="error" /> : null}

      {zone.data ? (
        <section className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
          <DataPanel title="Properties" description="Zone record metadata.">
            <RowList>
              <Row
                title="Environment"
                detail={zone.data.environmentType}
                meta={<StatusBadge value={zone.data.environmentType} />}
              />
              <Row title="Slug" detail={zone.data.slug} />
              <Row title="Grow area" detail={zone.data.growAreaId} />
              <Row
                title="Updated"
                detail={formatDateTime(zone.data.updatedAt)}
              />
            </RowList>
          </DataPanel>

          <DataPanel title="Plants" description="Plants assigned to this zone.">
            {plants.isLoading ? <DataNotice state="loading" /> : null}
            {plants.isError ? <DataNotice state="error" /> : null}
            {plants.data && plants.data.length > 0 ? (
              <RowList>
                {plants.data.map((plant) => (
                  <Row
                    key={plant.id}
                    title={plant.name}
                    detail={plant.code ?? plant.status}
                    meta={<StatusBadge value={plant.currentHealthStatus} />}
                  >
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/plants/${plant.id}`}>Open</Link>
                    </Button>
                  </Row>
                ))}
              </RowList>
            ) : !plants.isLoading && !plants.isError ? (
              <EmptyState title="No plants in this zone" />
            ) : null}
          </DataPanel>
        </section>
      ) : null}

      {zone.data ? (
        <ZoneLayoutPreview
          zoneName={zone.data.name}
          plants={plants.data ?? []}
          profiles={profiles.data ?? []}
          layout={
            zone.data.metadata && typeof zone.data.metadata === "object"
              ? ((zone.data.metadata as Record<string, unknown>).layout as
                  | {
                      version?: number;
                      rows?: number;
                      columns?: number;
                      slots?: Array<{
                        id?: string;
                        label?: string;
                        plantId?: string | null;
                        plantName?: string | null;
                        plantCode?: string | null;
                        note?: string | null;
                      }>;
                    }
                  | undefined)
              : undefined
          }
        />
      ) : null}

      {zone.data ? (
        <DataPanel
          title="Layout editor"
          description="Persist the zone layout in metadata."
        >
          <ZoneLayoutEditor zone={zone.data} plants={plants.data ?? []} />
        </DataPanel>
      ) : null}

      <DataPanel
        title="Target profiles"
        description="Target configuration history."
      >
        <div className="grid gap-4">
          <ZoneProfileForm zoneId={zoneId} />

          {profiles.isLoading ? <DataNotice state="loading" /> : null}
          {profiles.isError ? <DataNotice state="error" /> : null}
          {activateProfileMutation.error ? (
            <p className="text-xs text-red-600 dark:text-red-300">
              {activateProfileMutation.error.message}
            </p>
          ) : null}
          {profiles.data && profiles.data.length > 0 ? (
            <RowList>
              {profiles.data.map((profile) => (
                <Row
                  key={profile.id}
                  title={profile.name}
                  detail={formatDateTime(profile.updatedAt)}
                  meta={
                    <StatusBadge
                      value={profile.isActive ? "active" : "inactive"}
                    />
                  }
                >
                  {!profile.isActive ? (
                    <Button
                      disabled={activateProfileMutation.isPending}
                      onClick={() => activateProfileMutation.mutate(profile.id)}
                      size="sm"
                      variant="outline"
                    >
                      Activate
                    </Button>
                  ) : null}
                </Row>
              ))}
            </RowList>
          ) : !profiles.isLoading && !profiles.isError ? (
            <EmptyState
              title="No target profiles"
              detail="Add the first target profile above."
            />
          ) : null}
        </div>
      </DataPanel>
    </div>
  );
}
