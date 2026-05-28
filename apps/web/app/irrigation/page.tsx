"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Droplets, PowerOff, RefreshCcw, ShieldCheck } from "lucide-react";

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
import {
  fetchIrrigationSafety,
  fetchIrrigationSystems,
  queryKeys,
} from "@/lib/queries";

const poll = 30_000;

export default function IrrigationPage() {
  const queryClient = useQueryClient();
  const systems = useQuery({
    queryKey: queryKeys.irrigationSystems,
    queryFn: fetchIrrigationSystems,
    refetchInterval: poll,
  });
  const safety = useQuery({
    queryKey: queryKeys.irrigationSafety,
    queryFn: fetchIrrigationSafety,
    refetchInterval: poll,
  });

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Irrigation"
        title="Irrigation Safety"
        description="Read-only irrigation state. Manual and automation commands remain blocked."
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

      {systems.isError || safety.isError ? <DataNotice state="error" /> : null}

      <section className="grid gap-3 md:grid-cols-3">
        <MetricCard
          title="Manual"
          value={safety.data?.manualRunEnabled ? "Enabled" : "Disabled"}
          detail={safety.data?.manualRunResponseCode ?? "IRRIGATION_DISABLED"}
          icon={PowerOff}
          tone={safety.data?.manualRunEnabled ? "warning" : "success"}
        />
        <MetricCard
          title="Automation"
          value={safety.data?.automationEnabled ? "Enabled" : "Disabled"}
          detail="No automatic watering"
          icon={ShieldCheck}
          tone={safety.data?.automationEnabled ? "warning" : "success"}
        />
        <MetricCard
          title="Systems"
          value={systems.data?.length ?? 0}
          detail="Read-only configured rows"
          icon={Droplets}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <DataPanel title="Safety" description="Effective runtime state.">
          {safety.isLoading ? <DataNotice state="loading" /> : null}
          {safety.data ? (
            <RowList>
              <Row
                title="Safe mode"
                detail={safety.data.code}
                meta={
                  <StatusBadge
                    value={safety.data.safeMode ? "active" : "warning"}
                  />
                }
              />
              <Row
                title="Manual flag"
                detail="Configured feature flag"
                meta={
                  <StatusBadge
                    value={
                      safety.data.manualFlagConfigured ? "enabled" : "disabled"
                    }
                  />
                }
              />
              <Row
                title="Automation flag"
                detail="Configured feature flag"
                meta={
                  <StatusBadge
                    value={
                      safety.data.automationFlagConfigured
                        ? "enabled"
                        : "disabled"
                    }
                  />
                }
              />
              <Row
                title="Pump commands"
                detail="Effective command surface"
                meta={
                  <StatusBadge
                    value={
                      safety.data.pumpCommandsEnabled ? "enabled" : "disabled"
                    }
                  />
                }
              />
            </RowList>
          ) : null}
        </DataPanel>

        <DataPanel title="Systems" description="Configured irrigation rows.">
          {systems.isLoading ? <DataNotice state="loading" /> : null}
          {systems.data && systems.data.length > 0 ? (
            <RowList>
              {systems.data.map((system) => (
                <Row
                  key={system.id}
                  title={system.name}
                  detail={formatDateTime(system.updatedAt)}
                  meta={
                    <StatusBadge
                      value={system.enabled ? "active" : "disabled"}
                    />
                  }
                >
                  <Button disabled size="sm" variant="outline">
                    <PowerOff className="h-4 w-4" aria-hidden="true" />
                    Manual run disabled
                  </Button>
                </Row>
              ))}
            </RowList>
          ) : !systems.isLoading && !systems.isError ? (
            <EmptyState title="No irrigation systems" />
          ) : null}
        </DataPanel>
      </section>
    </div>
  );
}
