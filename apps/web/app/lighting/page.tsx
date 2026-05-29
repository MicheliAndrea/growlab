"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock3, Lightbulb, RefreshCcw } from "lucide-react";

import { LightingControlCard } from "@/components/lighting/lighting-control-card";
import { LightingProfileForm } from "@/components/lighting/lighting-profile-form";
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
import {
  fetchLightingProfiles,
  fetchLightingSystems,
  fetchZones,
  queryKeys,
} from "@/lib/queries";

const poll = 30_000;

export default function LightingPage() {
  const queryClient = useQueryClient();
  const systems = useQuery({
    queryKey: queryKeys.lightingSystems,
    queryFn: fetchLightingSystems,
    refetchInterval: poll,
  });
  const zones = useQuery({
    queryKey: queryKeys.zones,
    queryFn: fetchZones,
    refetchInterval: poll,
  });
  const profiles = useQuery({
    queryKey: queryKeys.lightingProfiles(),
    queryFn: () => fetchLightingProfiles(),
    refetchInterval: poll,
  });
  const enabledSystems =
    systems.data?.filter((system) => system.enabled).length ?? 0;
  const activeProfiles =
    profiles.data?.filter((profile) => profile.enabled).length ?? 0;
  const stepCount =
    profiles.data?.reduce(
      (count, profile) => count + profile.steps.length,
      0,
    ) ?? 0;

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Lighting"
        title="Lighting Control"
        description="Configured systems, schedules and profile steps."
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
          title="Systems"
          value={systems.data?.length ?? 0}
          detail="Lighting providers"
          icon={Lightbulb}
        />
        <MetricCard
          title="Enabled"
          value={enabledSystems}
          detail="Active lighting systems"
          icon={Lightbulb}
          tone={enabledSystems > 0 ? "success" : "secondary"}
        />
        <MetricCard
          title="Profiles"
          value={activeProfiles}
          detail="Enabled schedules"
          icon={Clock3}
          tone={activeProfiles > 0 ? "success" : "secondary"}
        />
        <MetricCard
          title="Profile steps"
          value={stepCount}
          detail="Scheduled actions"
          icon={Clock3}
        />
      </section>

      <section className="grid gap-3">
        <div>
          <h2 className="text-sm font-semibold">Shelly controls</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Local Shelly Dimmer 2 state and commands.
          </p>
        </div>
        {systems.isLoading ? <DataNotice state="loading" /> : null}
        {systems.isError ? <DataNotice state="error" /> : null}
        {systems.data && systems.data.length > 0 ? (
          <div className="grid gap-4 xl:grid-cols-2">
            {systems.data.map((system) => (
              <LightingControlCard key={system.id} system={system} />
            ))}
          </div>
        ) : !systems.isLoading && !systems.isError ? (
          <EmptyState title="No lighting systems" />
        ) : null}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <DataPanel
          title="Create profile"
          description="Lighting schedule setup."
        >
          {zones.isLoading || systems.isLoading ? (
            <DataNotice state="loading" />
          ) : null}
          {zones.isError || systems.isError ? (
            <DataNotice state="error" />
          ) : null}
          {zones.data && systems.data ? (
            <LightingProfileForm zones={zones.data} systems={systems.data} />
          ) : null}
        </DataPanel>

        <DataPanel title="Profiles" description="Zone lighting schedules.">
          {profiles.isLoading ? <DataNotice state="loading" /> : null}
          {profiles.isError ? <DataNotice state="error" /> : null}
          {profiles.data && profiles.data.length > 0 ? (
            <RowList>
              {profiles.data.map((profile) => (
                <Row
                  key={profile.id}
                  title={profile.name}
                  detail={`${profile.steps.length} steps - ${profile.timezone} - zone ${profile.zoneId}`}
                  meta={
                    <StatusBadge
                      value={profile.enabled ? "active" : "offline"}
                    />
                  }
                >
                  <StatusBadge
                    value={profile.isDefault ? "default" : "custom"}
                  />
                </Row>
              ))}
            </RowList>
          ) : !profiles.isLoading && !profiles.isError ? (
            <EmptyState title="No lighting profiles" />
          ) : null}
        </DataPanel>
      </section>
    </div>
  );
}
