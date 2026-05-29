"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import {
  fetchDevice,
  fetchDeviceCapabilities,
  fetchDeviceProvisioning,
  queryKeys,
} from "@/lib/queries";

const poll = 30_000;

export function DeviceDetail({ deviceId }: { deviceId: string }) {
  const queryClient = useQueryClient();
  const device = useQuery({
    queryKey: queryKeys.device(deviceId),
    queryFn: () => fetchDevice(deviceId),
    refetchInterval: poll,
  });
  const capabilities = useQuery({
    queryKey: queryKeys.deviceCapabilities(deviceId),
    queryFn: () => fetchDeviceCapabilities(deviceId),
    refetchInterval: poll,
  });
  const provisioning = useQuery({
    queryKey: queryKeys.deviceProvisioning(deviceId),
    queryFn: () => fetchDeviceProvisioning(deviceId),
    refetchInterval: poll,
  });

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Device detail"
        title={device.data?.name ?? "Device"}
        description="Capabilities, provisioning snapshot and runtime metadata."
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
          <Button asChild size="sm" variant="outline">
            <Link href="/devices">Back</Link>
          </Button>
        </div>
      </PageHeader>

      {device.isLoading ? <DataNotice state="loading" /> : null}
      {device.isError ? <DataNotice state="error" /> : null}

      {device.data ? (
        <section className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
          <DataPanel title="Properties" description="Device record metadata.">
            <RowList>
              <Row
                title="Status"
                detail={device.data.deviceType}
                meta={<StatusBadge value={device.data.status} />}
              />
              <Row title="UID" detail={device.data.deviceUid} />
              <Row
                title="Zone"
                detail={device.data.zoneId ?? "unassigned"}
                meta={
                  device.data.zoneId ? (
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/zones/${device.data.zoneId}`}>
                        Open zone
                      </Link>
                    </Button>
                  ) : undefined
                }
              />
              <Row
                title="Firmware"
                detail={device.data.firmwareVersion ?? "not set"}
                meta={
                  <StatusBadge value={device.data.firmwareChannelId ?? "n/a"} />
                }
              />
              <Row
                title="Last seen"
                detail={formatDateTime(device.data.lastSeenAt)}
              />
              <Row
                title="Updated"
                detail={formatDateTime(device.data.updatedAt)}
              />
            </RowList>
          </DataPanel>

          <DataPanel title="Raw config" description="Stored JSON payloads.">
            <div className="grid gap-4">
              <div>
                <div className="mb-2 text-sm font-medium">Config</div>
                <pre className="max-h-80 overflow-auto rounded-md border border-border bg-muted p-3 text-xs">
                  {JSON.stringify(device.data.config ?? {}, null, 2)}
                </pre>
              </div>
              <div>
                <div className="mb-2 text-sm font-medium">Metadata</div>
                <pre className="max-h-80 overflow-auto rounded-md border border-border bg-muted p-3 text-xs">
                  {JSON.stringify(device.data.metadata ?? {}, null, 2)}
                </pre>
              </div>
            </div>
          </DataPanel>
        </section>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-2">
        <DataPanel title="Capabilities" description="Enabled device features.">
          {capabilities.isLoading ? <DataNotice state="loading" /> : null}
          {capabilities.isError ? <DataNotice state="error" /> : null}
          {capabilities.data && capabilities.data.length > 0 ? (
            <RowList>
              {capabilities.data.map((capability) => (
                <Row
                  key={capability.id}
                  title={capability.capabilityKey}
                  detail={capability.capabilityType}
                  meta={
                    <StatusBadge
                      value={capability.enabled ? "active" : "offline"}
                    />
                  }
                />
              ))}
            </RowList>
          ) : !capabilities.isLoading && !capabilities.isError ? (
            <EmptyState title="No capabilities" />
          ) : null}
        </DataPanel>

        <DataPanel title="Provisioning" description="Claim snapshot.">
          {provisioning.isLoading ? <DataNotice state="loading" /> : null}
          {provisioning.isError ? <DataNotice state="error" /> : null}
          {provisioning.data ? (
            <RowList>
              <Row
                title="Status"
                detail={formatDateTime(provisioning.data.updatedAt)}
                meta={<StatusBadge value={provisioning.data.status} />}
              />
              <Row
                title="Expires at"
                detail={formatDateTime(provisioning.data.expiresAt)}
                meta={<StatusBadge value="expiry" />}
              />
              <Row
                title="Claimed at"
                detail={formatDateTime(provisioning.data.claimedAt)}
                meta={
                  <StatusBadge value={provisioning.data.deviceId ?? "open"} />
                }
              />
            </RowList>
          ) : !provisioning.isLoading && !provisioning.isError ? (
            <EmptyState title="No provisioning metadata" />
          ) : null}
        </DataPanel>
      </section>
    </div>
  );
}
