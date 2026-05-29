"use client";

import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { Cpu, Gauge, RefreshCcw, ShieldCheck } from "lucide-react";
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
import { DeviceProvisioningPanel } from "@/components/devices/device-provisioning-panel";
import { SensorCalibrationPanel } from "@/components/devices/sensor-calibration-panel";
import {
  fetchDeviceCapabilities,
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

  const capabilityCount = capabilityQueries.reduce(
    (count, query) => count + (query.data?.length ?? 0),
    0,
  );
  const onlineDevices =
    devices.data?.filter((device) => device.status === "online").length ?? 0;

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Devices"
        title="Device Fleet"
        description="Controllers, capabilities and provisioning metadata."
      >
        <div className="flex flex-wrap gap-2">
          <ExportButton
            jsonFilename="devices.json"
            csvFilename="devices.csv"
            data={devices.data ?? []}
            csvRows={(devices.data ?? []).map((device) => ({
              id: device.id,
              name: device.name,
              deviceUid: device.deviceUid,
              deviceType: device.deviceType,
              status: device.status,
              zoneId: device.zoneId ?? "",
              firmwareVersion: device.firmwareVersion ?? "",
              firmwareChannelId: device.firmwareChannelId ?? "",
              lastSeenAt: device.lastSeenAt ?? "",
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
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/devices/${device.id}`}>Open</Link>
                  </Button>
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

      <DataPanel
        title="Provisioning"
        description="Device claim metadata and config preview."
      >
        <DeviceProvisioningPanel devices={devices.data ?? []} />
      </DataPanel>

      <DataPanel
        title="Sensor calibration"
        description="Manual calibration records keyed by sensor id."
      >
        <SensorCalibrationPanel />
      </DataPanel>
    </div>
  );
}
