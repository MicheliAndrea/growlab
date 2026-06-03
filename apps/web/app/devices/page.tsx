"use client";

import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  Cpu,
  Gauge,
  RefreshCcw,
  ShieldCheck,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
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
  formatDateTime,
  MetricCard,
  PageHeader,
  Row,
  RowList,
  StatusBadge,
} from "@/components/dashboard/ui";
import { ExportButton } from "@/components/dashboard/export-button";
import { DeviceCapabilityForm } from "@/components/devices/device-capability-form";
import { DeviceProvisioningPanel } from "@/components/devices/device-provisioning-panel";
import { SensorCalibrationPanel } from "@/components/devices/sensor-calibration-panel";
import {
  fetchDeviceCapabilities,
  fetchDevices,
  queryKeys,
  updateDeviceCapabilityEntry,
} from "@/lib/queries";
import { usePersistentStringState } from "@/lib/persistent-state";

const poll = 30_000;

export default function DevicesPage() {
  const queryClient = useQueryClient();
  const [deviceSearch, setDeviceSearch] = usePersistentStringState(
    "devices.search",
    "",
  );
  const [statusFilter, setStatusFilter] = usePersistentStringState(
    "devices.status",
    "all",
  );
  const [typeFilter, setTypeFilter] = usePersistentStringState(
    "devices.type",
    "all",
  );
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
  const capabilityMutation = useMutation({
    mutationFn: (input: {
      deviceId: string;
      capabilityId: string;
      enabled: boolean;
    }) =>
      updateDeviceCapabilityEntry(input.deviceId, input.capabilityId, {
        enabled: input.enabled,
        metadata: { source: "web-dashboard" },
      }),
    onSuccess: async (_capability, input) => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.deviceCapabilities(input.deviceId),
      });
    },
  });

  const capabilityCount = capabilityQueries.reduce(
    (count, query) => count + (query.data?.length ?? 0),
    0,
  );
  const onlineDevices =
    devices.data?.filter((device) => device.status === "online").length ?? 0;
  const statusOptions = useMemo(
    () =>
      uniqueFilterOptions(
        (devices.data ?? []).map((device) => device.status),
        "All statuses",
      ),
    [devices.data],
  );
  const typeOptions = useMemo(
    () =>
      uniqueFilterOptions(
        (devices.data ?? []).map((device) => device.deviceType),
        "All types",
      ),
    [devices.data],
  );
  const filteredDevices = useMemo(() => {
    const search = deviceSearch.trim().toLowerCase();

    return (devices.data ?? []).filter((device) => {
      const matchesSearch =
        search.length === 0 ||
        [
          device.name,
          device.deviceUid,
          device.deviceType,
          device.status,
          device.firmwareVersion,
          device.zoneId,
        ].some((value) => value?.toLowerCase().includes(search));
      const matchesStatus =
        statusFilter === "all" || device.status === statusFilter;
      const matchesType =
        typeFilter === "all" || device.deviceType === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [deviceSearch, devices.data, statusFilter, typeFilter]);
  const visibleDeviceIds = new Set(filteredDevices.map((device) => device.id));
  const visibleCapabilityRows = capabilityQueries.flatMap((query, index) => {
    const device = devices.data?.[index];

    if (!device || !visibleDeviceIds.has(device.id)) {
      return [];
    }

    return (query.data ?? []).map((capability) => ({ capability, device }));
  });

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
            data={filteredDevices}
            csvRows={filteredDevices.map((device) => ({
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

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
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
        <MetricCard
          title="Visible"
          value={filteredDevices.length}
          detail="After list filters"
          icon={Cpu}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <DataPanel title="Devices" description="Current device records.">
          <ListFilterBar
            hasActiveFilters={
              deviceSearch !== "" ||
              statusFilter !== "all" ||
              typeFilter !== "all"
            }
            onReset={() => {
              setDeviceSearch("");
              setStatusFilter("all");
              setTypeFilter("all");
            }}
            resultCount={filteredDevices.length}
            totalCount={devices.data?.length ?? 0}
          >
            <SearchFilter
              label="Search devices"
              placeholder="Search devices"
              value={deviceSearch}
              onValueChange={setDeviceSearch}
            />
            <SelectFilter
              label="Filter device status"
              value={statusFilter}
              onValueChange={setStatusFilter}
              options={statusOptions}
            />
            <SelectFilter
              label="Filter device type"
              value={typeFilter}
              onValueChange={setTypeFilter}
              options={typeOptions}
            />
          </ListFilterBar>
          {devices.isLoading ? <DataNotice state="loading" /> : null}
          {devices.isError ? <DataNotice state="error" /> : null}
          {filteredDevices.length > 0 ? (
            <RowList>
              {filteredDevices.map((device) => (
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
          ) : !devices.isLoading && !devices.isError && devices.data ? (
            <EmptyState
              title={
                devices.data.length > 0 ? "No matching devices" : "No devices"
              }
            />
          ) : null}
        </DataPanel>

        <DataPanel title="Capabilities" description="Enabled device features.">
          {capabilityQueries.some((query) => query.isLoading) ? (
            <DataNotice state="loading" />
          ) : null}
          {capabilityMutation.error ? (
            <p className="text-xs text-red-600 dark:text-red-300">
              {capabilityMutation.error.message}
            </p>
          ) : null}
          {capabilityCount === 0 &&
          !capabilityQueries.some((query) => query.isLoading) ? (
            <EmptyState title="No capabilities" />
          ) : null}
          {capabilityCount > 0 && visibleCapabilityRows.length === 0 ? (
            <EmptyState title="No capabilities for visible devices" />
          ) : null}
          {visibleCapabilityRows.length > 0 ? (
            <RowList>
              {visibleCapabilityRows.map(({ capability, device }) => (
                <Row
                  key={capability.id}
                  title={capability.capabilityKey}
                  detail={device.name}
                  meta={
                    <StatusBadge
                      value={capability.enabled ? "active" : "offline"}
                    />
                  }
                >
                  <Button
                    disabled={capabilityMutation.isPending}
                    onClick={() =>
                      capabilityMutation.mutate({
                        deviceId: capability.deviceId,
                        capabilityId: capability.id,
                        enabled: !capability.enabled,
                      })
                    }
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    {capability.enabled ? (
                      <ToggleLeft className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <ToggleRight className="h-4 w-4" aria-hidden="true" />
                    )}
                    {capability.enabled ? "Disable" : "Enable"}
                  </Button>
                </Row>
              ))}
            </RowList>
          ) : null}
        </DataPanel>
      </section>

      <DataPanel
        title="Add capability"
        description="Manual device capability metadata."
      >
        <DeviceCapabilityForm devices={devices.data ?? []} />
      </DataPanel>

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
