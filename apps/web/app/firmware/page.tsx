"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Package, RefreshCcw, Rocket } from "lucide-react";

import { FirmwareUploadForm } from "@/components/firmware/firmware-upload-form";
import { OtaControlPanel } from "@/components/firmware/ota-control-panel";
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
  fetchDevices,
  fetchFirmwareChannels,
  fetchFirmwareVersions,
  queryKeys,
} from "@/lib/queries";
import { firmwareFileUrl } from "@/lib/api";

const poll = 30_000;

export default function FirmwarePage() {
  const queryClient = useQueryClient();
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
  const defaultChannels =
    channels.data?.filter((channel) => channel.isDefault).length ?? 0;

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Firmware"
        title="Firmware Releases"
        description="OTA artifacts, release channels and dry-run entry points."
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
          {versions.isLoading ? <DataNotice state="loading" /> : null}
          {versions.isError ? <DataNotice state="error" /> : null}
          {versions.data && versions.data.length > 0 ? (
            <RowList>
              {versions.data.map((version) => (
                <Row
                  key={version.id}
                  title={version.version}
                  detail={`${version.deviceType} - ${formatDateTime(
                    version.createdAt,
                  )}`}
                  meta={
                    <StatusBadge value={version.channelId ?? "unassigned"} />
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
          ) : !versions.isLoading && !versions.isError ? (
            <EmptyState title="No firmware versions" />
          ) : null}
        </DataPanel>

        <DataPanel title="Channels" description="Release lanes.">
          {channels.isLoading ? <DataNotice state="loading" /> : null}
          {channels.isError ? <DataNotice state="error" /> : null}
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
                />
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
