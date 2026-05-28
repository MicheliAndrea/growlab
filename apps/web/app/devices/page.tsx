"use client";

import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { Cpu, Gauge, RefreshCcw, ShieldCheck } from "lucide-react";

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
  fetchDeviceCapabilities,
  fetchDeviceProvisioning,
  fetchDevices,
  queryKeys,
} from "@/lib/queries";

const poll = 30_000;

export default function DevicesPage() {
  const queryClient = useQueryClient();
  const devices = useQuery({
    queryKey: queryKeys.devices,
    queryFn: fetchDevices,
    refetchInterval: poll,
  });
  const capabilityQueries = useQueries({
    queries: (devices.data ?? []).map((device) => ({
      queryKey: queryKeys.deviceCapabilities(device.id),
      queryFn: () => fetchDeviceCapabilities(device.id),
      refetchInterval: poll,
    })),
  });
  const provisioningQueries = useQueries({
    queries: (devices.data ?? []).map((device) => ({
      queryKey: queryKeys.deviceProvisioning(device.id),
      queryFn: () => fetchDeviceProvisioning(device.id),
      refetchInterval: poll,
    })),
  });

  const capabilityCount = capabilityQueries.reduce(
    (count, query) => count + (query.data?.length ?? 0),
    0,
  );
  const onlineDevices =
    devices.data?.filter((device) => device.status === "online").length ?? 0;
  const provisioningCount = provisioningQueries.filter(
    (query) => query.data,
  ).length;

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Devices"
        title="Device Fleet"
        description="Controllers, capabilities and provisioning metadata."
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

      <section className="grid gap-3 md:grid-cols-3">
        <MetricCard
          title="Devices"
          value={devices.data?.length ?? 0}
          detail="Registered controllers"
          icon={Cpu}
        />
        <MetricCard
          title="Online"
          value={onlineDevices}
          detail="Last heartbeat status"
          icon={Gauge}
          tone={onlineDevices > 0 ? "success" : "secondary"}
        />
        <MetricCard
          title="Capabilities"
          value={capabilityCount}
          detail="Device capability rows"
          icon={ShieldCheck}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <DataPanel title="Devices" description="Current device records.">
          {devices.isLoading ? <DataNotice state="loading" /> : null}
          {devices.isError ? <DataNotice state="error" /> : null}
          {devices.data && devices.data.length > 0 ? (
            <RowList>
              {devices.data.map((device) => (
                <Row
                  key={device.id}
                  title={device.name}
                  detail={`${device.deviceType} - ${device.deviceUid}`}
                  meta={<StatusBadge value={device.status} />}
                >
                  <span className="text-xs text-muted-foreground">
                    {formatDateTime(device.lastSeenAt)}
                  </span>
                </Row>
              ))}
            </RowList>
          ) : !devices.isLoading && !devices.isError ? (
            <EmptyState title="No devices" />
          ) : null}
        </DataPanel>

        <DataPanel title="Capabilities" description="Enabled device features.">
          {capabilityQueries.some((query) => query.isLoading) ? (
            <DataNotice state="loading" />
          ) : null}
          {capabilityCount === 0 &&
          !capabilityQueries.some((query) => query.isLoading) ? (
            <EmptyState title="No capabilities" />
          ) : null}
          {capabilityCount > 0 ? (
            <RowList>
              {capabilityQueries.flatMap((query, index) =>
                (query.data ?? []).map((capability) => (
                  <Row
                    key={capability.id}
                    title={capability.capabilityKey}
                    detail={devices.data?.[index]?.name}
                    meta={
                      <StatusBadge
                        value={capability.enabled ? "active" : "offline"}
                      />
                    }
                  />
                )),
              )}
            </RowList>
          ) : null}
        </DataPanel>
      </section>

      <DataPanel title="Provisioning" description="Device claim metadata.">
        {provisioningCount === 0 ? (
          <EmptyState title="No provisioning metadata" />
        ) : (
          <RowList>
            {provisioningQueries.map((query, index) =>
              query.data ? (
                <Row
                  key={query.data.id}
                  title={devices.data?.[index]?.name ?? query.data.id}
                  detail={formatDateTime(query.data.expiresAt)}
                  meta={<StatusBadge value={query.data.status} />}
                />
              ) : null,
            )}
          </RowList>
        )}
      </DataPanel>
    </div>
  );
}
