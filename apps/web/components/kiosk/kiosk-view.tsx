"use client";

import * as React from "react";
import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Clock3, Cpu, RefreshCcw, Sprout } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { ImageGallery } from "@/components/images/image-gallery";
import {
  DataNotice,
  DataPanel,
  EmptyState,
  formatDateTime,
  MetricCard,
  PageHeader,
  Row,
  RowList,
  SeverityBadge,
  StatusBadge,
} from "@/components/dashboard/ui";
import {
  fetchDevices,
  fetchHealth,
  fetchPlantImages,
  fetchPlants,
  fetchSystemAlerts,
  fetchSystemEvents,
  fetchZones,
  fetchLightingSystems,
  queryKeys,
} from "@/lib/queries";

const poll = 30_000;

export function KioskView() {
  const queryClient = useQueryClient();
  const [now, setNow] = React.useState(() => new Date());

  React.useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(interval);
  }, []);

  const health = useQuery({
    queryKey: queryKeys.health,
    queryFn: fetchHealth,
    refetchInterval: poll,
  });
  const zones = useQuery({
    queryKey: queryKeys.zones,
    queryFn: fetchZones,
    refetchInterval: poll,
  });
  const plants = useQuery({
    queryKey: queryKeys.plants,
    queryFn: fetchPlants,
    refetchInterval: poll,
  });
  const devices = useQuery({
    queryKey: queryKeys.devices,
    queryFn: fetchDevices,
    refetchInterval: poll,
  });
  const alerts = useQuery({
    queryKey: queryKeys.systemAlerts("active"),
    queryFn: () => fetchSystemAlerts("active"),
    refetchInterval: 15_000,
  });
  const events = useQuery({
    queryKey: queryKeys.systemEvents,
    queryFn: fetchSystemEvents,
    refetchInterval: poll,
  });
  const lighting = useQuery({
    queryKey: queryKeys.lightingSystems,
    queryFn: fetchLightingSystems,
    refetchInterval: poll,
  });
  const imageQueries = useQueries({
    queries: (plants.data ?? []).slice(0, 8).map((plant) => ({
      queryKey: queryKeys.plantImages(plant.id),
      queryFn: () => fetchPlantImages(plant.id),
      refetchInterval: poll,
    })),
  });

  const images = imageQueries
    .flatMap((query, index) =>
      (query.data ?? []).map((image) => ({
        ...image,
        plantName: plants.data?.[index]?.name ?? "Plant",
      })),
    )
    .sort((left, right) => {
      const leftTime = new Date(left.capturedAt ?? left.uploadedAt).getTime();
      const rightTime = new Date(
        right.capturedAt ?? right.uploadedAt,
      ).getTime();
      return rightTime - leftTime;
    })
    .slice(0, 6);

  const onlineDevices =
    devices.data?.filter((device) => device.status === "online").length ?? 0;
  const activeAlerts = alerts.data?.length ?? 0;
  const zoneCount = zones.data?.length ?? 0;
  const plantCount = plants.data?.length ?? 0;
  const lightingCount = lighting.data?.length ?? 0;

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Kiosk"
        title="GrowLab Kiosk"
        description="Read-only wall display with live system status."
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

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        <MetricCard
          title="Time"
          value={now.toLocaleTimeString("en-GB", {
            hour: "2-digit",
            minute: "2-digit",
          })}
          detail={now.toLocaleDateString("en-GB", {
            weekday: "short",
            day: "2-digit",
            month: "short",
          })}
          icon={Clock3}
        />
        <MetricCard
          title="API"
          value={health.data?.status ?? "unknown"}
          detail={health.data?.service ?? "GrowLab API"}
          icon={Cpu}
          tone={health.data?.status === "ok" ? "success" : "warning"}
        />
        <MetricCard
          title="Zones"
          value={zoneCount}
          detail="Configured spaces"
          icon={Sprout}
        />
        <MetricCard
          title="Plants"
          value={plantCount}
          detail="Tracked inventory"
          icon={Sprout}
        />
        <MetricCard
          title="Devices"
          value={`${onlineDevices}/${devices.data?.length ?? 0}`}
          detail="MQTT heartbeat"
          icon={Cpu}
          tone={onlineDevices > 0 ? "success" : "secondary"}
        />
        <MetricCard
          title="Alerts"
          value={activeAlerts}
          detail="Active queue"
          icon={AlertTriangle}
          tone={activeAlerts > 0 ? "destructive" : "success"}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <DataPanel
          title="System state"
          description="Current high level status."
        >
          <RowList>
            <Row
              title="API"
              detail={
                health.data?.time ? formatDateTime(health.data.time) : "not set"
              }
              meta={<StatusBadge value={health.data?.status ?? "unknown"} />}
            />
            <Row
              title="Lighting systems"
              detail="Configured and polling"
              meta={<StatusBadge value={`${lightingCount}`} />}
            />
            <Row
              title="Device fleet"
              detail="Online vs total"
              meta={
                <StatusBadge
                  value={`${onlineDevices}/${devices.data?.length ?? 0}`}
                />
              }
            />
            <Row
              title="Active alerts"
              detail="Read-only kiosk surface"
              meta={
                <StatusBadge value={activeAlerts > 0 ? "active" : "clear"} />
              }
            />
          </RowList>
        </DataPanel>

        <DataPanel title="Active alerts" description="Current alert queue.">
          {alerts.isLoading ? <DataNotice state="loading" /> : null}
          {alerts.isError ? <DataNotice state="error" /> : null}
          {alerts.data && alerts.data.length > 0 ? (
            <RowList>
              {alerts.data.slice(0, 5).map((alert) => (
                <Row
                  key={alert.id}
                  title={alert.title}
                  detail={alert.message}
                  meta={<SeverityBadge value={alert.severity} />}
                />
              ))}
            </RowList>
          ) : !alerts.isLoading && !alerts.isError ? (
            <EmptyState title="No active alerts" />
          ) : null}
        </DataPanel>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <DataPanel
          title="Latest images"
          description="Most recent plant photos."
        >
          {plants.isLoading || imageQueries.some((query) => query.isLoading) ? (
            <DataNotice state="loading" />
          ) : null}
          {plants.isError || imageQueries.some((query) => query.isError) ? (
            <DataNotice state="error" />
          ) : null}
          {images.length > 0 ? (
            <ImageGallery images={images} />
          ) : !plants.isLoading &&
            !imageQueries.some((query) => query.isLoading) ? (
            <EmptyState title="No images yet" />
          ) : null}
        </DataPanel>

        <DataPanel title="Recent events" description="System event stream.">
          {events.isLoading ? <DataNotice state="loading" /> : null}
          {events.isError ? <DataNotice state="error" /> : null}
          {events.data && events.data.length > 0 ? (
            <RowList>
              {events.data.slice(0, 8).map((event) => (
                <Row
                  key={event.id}
                  title={event.eventType}
                  detail={`${event.source} - ${event.message}`}
                  meta={<SeverityBadge value={event.severity} />}
                >
                  {event.plantId ? (
                    <Link
                      className="text-xs text-muted-foreground underline-offset-4 hover:underline"
                      href={`/plants/${event.plantId}`}
                    >
                      Open plant
                    </Link>
                  ) : (
                    <span className="text-xs text-muted-foreground">Event</span>
                  )}
                </Row>
              ))}
            </RowList>
          ) : !events.isLoading && !events.isError ? (
            <EmptyState title="No events" />
          ) : null}
        </DataPanel>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <DataPanel title="Zones" description="Configured spaces.">
          {zones.data && zones.data.length > 0 ? (
            <RowList>
              {zones.data.slice(0, 6).map((zone) => (
                <Row
                  key={zone.id}
                  title={zone.name}
                  detail={zone.description ?? zone.environmentType}
                  meta={<StatusBadge value={zone.slug} />}
                >
                  <Link
                    className="text-xs text-muted-foreground underline-offset-4 hover:underline"
                    href={`/zones/${zone.id}`}
                  >
                    Open
                  </Link>
                </Row>
              ))}
            </RowList>
          ) : (
            <EmptyState title="No zones" />
          )}
        </DataPanel>

        <DataPanel title="Devices" description="Fleet heartbeat.">
          {devices.data && devices.data.length > 0 ? (
            <RowList>
              {devices.data.slice(0, 6).map((device) => (
                <Row
                  key={device.id}
                  title={device.name}
                  detail={device.deviceUid}
                  meta={<StatusBadge value={device.status} />}
                />
              ))}
            </RowList>
          ) : (
            <EmptyState title="No devices" />
          )}
        </DataPanel>
      </section>
    </div>
  );
}
