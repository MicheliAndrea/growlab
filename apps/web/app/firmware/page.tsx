"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  Download,
  Package,
  RefreshCcw,
  Rocket,
} from "lucide-react";
import { useMemo } from "react";

import { FirmwareUploadForm } from "@/components/firmware/firmware-upload-form";
import { OtaControlPanel } from "@/components/firmware/ota-control-panel";
import { Button } from "@/components/ui/button";
import {
  ListFilterBar,
  SearchFilter,
  SelectFilter,
  type FilterOption,
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
import {
  fetchDevices,
  fetchFirmwareChannels,
  fetchFirmwareVersions,
  queryKeys,
  setFirmwareChannelDefaultEntry,
} from "@/lib/queries";
import { firmwareFileUrl } from "@/lib/api";
import { usePersistentStringState } from "@/lib/persistent-state";

const poll = 30_000;

export default function FirmwarePage() {
  const queryClient = useQueryClient();
  const [firmwareSearch, setFirmwareSearch] = usePersistentStringState(
    "firmware.search",
    "",
  );
  const [deviceTypeFilter, setDeviceTypeFilter] = usePersistentStringState(
    "firmware.deviceType",
    "all",
  );
  const [channelFilter, setChannelFilter] = usePersistentStringState(
    "firmware.channel",
    "all",
  );
  const versions = useQuery({
    queryKey: queryKeys.firmwareVersions,
    queryFn: fetchFirmwareVersions,
    refetchInterval: poll,
  });
  const channels = useQuery({
    queryKey: queryKeys.firmwareChannels,
    queryFn: fetchFirmwareChannels,
    refetchInterval: poll,
  });
  const devices = useQuery({
    queryKey: queryKeys.devices,
    queryFn: fetchDevices,
    refetchInterval: poll,
  });
  const defaultChannelMutation = useMutation({
    mutationFn: setFirmwareChannelDefaultEntry,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.firmwareChannels,
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.firmwareVersions,
      });
    },
  });
  const defaultChannels =
    channels.data?.filter((channel) => channel.isDefault).length ?? 0;
  const channelNameById = useMemo(
    () =>
      new Map(
        (channels.data ?? []).map((channel) => [channel.id, channel.name]),
      ),
    [channels.data],
  );
  const deviceTypeOptions = useMemo(
    () =>
      uniqueFilterOptions(
        (versions.data ?? []).map((version) => version.deviceType),
        "All device types",
      ),
    [versions.data],
  );
  const channelOptions = useMemo<FilterOption[]>(() => {
    const hasUnassigned = (versions.data ?? []).some(
      (version) => !version.channelId,
    );

    return [
      { label: "All channels", value: "all" },
      ...(channels.data ?? []).map((channel) => ({
        label: channel.name,
        value: channel.id,
      })),
      ...(hasUnassigned ? [{ label: "unassigned", value: "unassigned" }] : []),
    ];
  }, [channels.data, versions.data]);
  const filteredVersions = useMemo(() => {
    const search = firmwareSearch.trim().toLowerCase();

    return (versions.data ?? []).filter((version) => {
      const channelName = version.channelId
        ? channelNameById.get(version.channelId)
        : "unassigned";
      const matchesSearch =
        search.length === 0 ||
        [
          version.version,
          version.deviceType,
          version.channelId,
          channelName,
        ].some((value) => value?.toLowerCase().includes(search));
      const matchesDeviceType =
        deviceTypeFilter === "all" || version.deviceType === deviceTypeFilter;
      const matchesChannel =
        channelFilter === "all" ||
        (channelFilter === "unassigned" && !version.channelId) ||
        version.channelId === channelFilter;

      return matchesSearch && matchesDeviceType && matchesChannel;
    });
  }, [
    channelFilter,
    channelNameById,
    deviceTypeFilter,
    firmwareSearch,
    versions.data,
  ]);

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Firmware"
        title="Firmware Releases"
        description="OTA artifacts, release channels and dry-run entry points."
      >
        <div className="flex flex-wrap gap-2">
          <ExportButton
            jsonFilename="firmware-versions.json"
            csvFilename="firmware-versions.csv"
            data={filteredVersions}
            csvRows={filteredVersions.map((version) => ({
              id: version.id,
              version: version.version,
              deviceType: version.deviceType,
              channelId: version.channelId ?? "",
              createdAt: version.createdAt,
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
          title="Versions"
          value={versions.data?.length ?? 0}
          detail="Stored firmware artifacts"
          icon={Package}
        />
        <MetricCard
          title="Channels"
          value={channels.data?.length ?? 0}
          detail="dev, beta and stable lanes"
          icon={Rocket}
        />
        <MetricCard
          title="Default"
          value={defaultChannels}
          detail="Default release channel"
          icon={Rocket}
          tone={defaultChannels > 0 ? "success" : "secondary"}
        />
        <MetricCard
          title="Visible"
          value={filteredVersions.length}
          detail="After list filters"
          icon={Package}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <DataPanel title="Upload" description="Firmware artifact registration.">
          <FirmwareUploadForm channels={channels.data ?? []} />
        </DataPanel>

        <DataPanel
          title="OTA Jobs"
          description="Manual job creation and status."
        >
          <OtaControlPanel
            devices={devices.data ?? []}
            firmwareVersions={versions.data ?? []}
          />
        </DataPanel>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <DataPanel title="Versions" description="Firmware artifact registry.">
          <ListFilterBar
            hasActiveFilters={
              firmwareSearch !== "" ||
              deviceTypeFilter !== "all" ||
              channelFilter !== "all"
            }
            onReset={() => {
              setFirmwareSearch("");
              setDeviceTypeFilter("all");
              setChannelFilter("all");
            }}
            resultCount={filteredVersions.length}
            totalCount={versions.data?.length ?? 0}
          >
            <SearchFilter
              label="Search firmware"
              placeholder="Search firmware"
              value={firmwareSearch}
              onValueChange={setFirmwareSearch}
            />
            <SelectFilter
              label="Filter firmware device type"
              value={deviceTypeFilter}
              onValueChange={setDeviceTypeFilter}
              options={deviceTypeOptions}
            />
            <SelectFilter
              label="Filter firmware channel"
              value={channelFilter}
              onValueChange={setChannelFilter}
              options={channelOptions}
            />
          </ListFilterBar>
          {versions.isLoading ? <DataNotice state="loading" /> : null}
          {versions.isError ? <DataNotice state="error" /> : null}
          {filteredVersions.length > 0 ? (
            <RowList>
              {filteredVersions.map((version) => (
                <Row
                  key={version.id}
                  title={version.version}
                  detail={`${version.deviceType} - ${formatDateTime(
                    version.createdAt,
                  )}`}
                  meta={
                    <StatusBadge
                      value={
                        version.channelId
                          ? (channelNameById.get(version.channelId) ??
                            version.channelId)
                          : "unassigned"
                      }
                    />
                  }
                >
                  <Button asChild size="sm" variant="outline">
                    <a href={firmwareFileUrl(version.id)}>
                      <Download className="h-4 w-4" aria-hidden="true" />
                      File
                    </a>
                  </Button>
                </Row>
              ))}
            </RowList>
          ) : !versions.isLoading && !versions.isError && versions.data ? (
            <EmptyState
              title={
                versions.data.length > 0
                  ? "No matching firmware versions"
                  : "No firmware versions"
              }
            />
          ) : null}
        </DataPanel>

        <DataPanel title="Channels" description="Release lanes.">
          {channels.isLoading ? <DataNotice state="loading" /> : null}
          {channels.isError ? <DataNotice state="error" /> : null}
          {defaultChannelMutation.error ? (
            <p className="text-xs text-red-600 dark:text-red-300">
              {defaultChannelMutation.error.message}
            </p>
          ) : null}
          {channels.data && channels.data.length > 0 ? (
            <RowList>
              {channels.data.map((channel) => (
                <Row
                  key={channel.id}
                  title={channel.name}
                  detail={
                    channel.description ?? formatDateTime(channel.createdAt)
                  }
                  meta={
                    <StatusBadge
                      value={channel.isDefault ? "active" : channel.name}
                    />
                  }
                >
                  {!channel.isDefault ? (
                    <Button
                      size="sm"
                      type="button"
                      variant="outline"
                      disabled={defaultChannelMutation.isPending}
                      onClick={() => defaultChannelMutation.mutate(channel.id)}
                    >
                      <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                      Set default
                    </Button>
                  ) : null}
                </Row>
              ))}
            </RowList>
          ) : !channels.isLoading && !channels.isError ? (
            <EmptyState title="No firmware channels" />
          ) : null}
        </DataPanel>
      </section>
    </div>
  );
}
