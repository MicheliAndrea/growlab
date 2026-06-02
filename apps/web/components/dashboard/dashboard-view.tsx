"use client";

import {
  Activity,
  AlertTriangle,
  Cpu,
  Gauge,
  Leaf,
  RefreshCcw,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import {
  DonutChart,
  OperationsAreaChart,
  ResourceBarChart,
} from "@/components/ui/chart";
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
  acknowledgeSystemAlert,
  resolveSystemAlert,
  SystemAlertStatus,
} from "@/lib/api";
import {
  fetchDevices,
  fetchFirmwareVersions,
  fetchHealth,
  fetchLatestSensorReadings,
  fetchLightingSystems,
  fetchPlants,
  fetchSystemAlerts,
  fetchSystemEvents,
  fetchZones,
  queryKeys,
} from "@/lib/queries";

const poll = 30_000;

export function DashboardView() {
  const queryClient = useQueryClient();
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
    queryKey: queryKeys.systemAlerts(SystemAlertStatus.active),
    queryFn: () => fetchSystemAlerts(SystemAlertStatus.active),
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
  const firmware = useQuery({
    queryKey: queryKeys.firmwareVersions,
    queryFn: fetchFirmwareVersions,
    refetchInterval: poll,
  });
  const latestReadings = useQuery({
    queryKey: queryKeys.latestSensorReadings(),
    queryFn: () => fetchLatestSensorReadings(),
    refetchInterval: 15_000,
  });

  const acknowledgeMutation = useMutation({
    mutationFn: (id: string) =>
      acknowledgeSystemAlert(id, { changedBy: "web-dashboard" }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["system-alerts"] });
      await queryClient.invalidateQueries({ queryKey: queryKeys.systemEvents });
    },
  });
  const resolveMutation = useMutation({
    mutationFn: (id: string) =>
      resolveSystemAlert(id, { changedBy: "web-dashboard" }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["system-alerts"] });
      await queryClient.invalidateQueries({ queryKey: queryKeys.systemEvents });
    },
  });

  const apiReady = health.data?.status ?? "unknown";
  const activeAlerts = alerts.data ?? [];
  const onlineDevices =
    devices.data?.filter((device) => device.status === "online").length ?? 0;
  const resourceData = [
    { name: "Zones", value: zones.data?.length ?? 0 },
    { name: "Plants", value: plants.data?.length ?? 0 },
    { name: "Devices", value: devices.data?.length ?? 0 },
    { name: "Lights", value: lighting.data?.length ?? 0 },
    { name: "Firmware", value: firmware.data?.length ?? 0 },
  ];
  const operationsData = resourceData.map((item) => ({
    time: item.name,
    value: item.value,
  }));
  const plantHealthData = [
    "healthy",
    "watch",
    "stressed",
    "critical",
    "dormant",
    "dead",
  ].map((status) => ({
    name: status,
    value:
      plants.data?.filter((plant) => plant.currentHealthStatus === status)
        .length ?? 0,
  }));
  const deviceStatusData = ["online", "offline", "maintenance", "unknown"].map(
    (status) => ({
      name: status,
      value:
        devices.data?.filter((device) => device.status === status).length ?? 0,
    }),
  );
  const eventSeverityData = ["critical", "error", "warning", "info"].map(
    (severity) => ({
      name: severity,
      value:
        events.data?.filter((event) => event.severity === severity).length ?? 0,
    }),
  );
  const telemetryTypeData = Array.from(
    (latestReadings.data ?? []).reduce((accumulator, reading) => {
      accumulator.set(
        reading.sensorType,
        (accumulator.get(reading.sensorType) ?? 0) + 1,
      );
      return accumulator;
    }, new Map<string, number>()),
  ).map(([name, value]) => ({ name, value }));
  const alertStatusData = [
    { name: "active", value: activeAlerts.length },
    {
      name: "clear",
      value: Math.max(0, (zones.data?.length ?? 0) - activeAlerts.length),
    },
  ];
  const alertTone = activeAlerts.length > 0 ? "alert" : "clear";

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Live dashboard"
        title="GrowLab Operations"
        description="Zone health, plant workload, devices, lighting and alert state."
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

      {health.isError ? <DataNotice state="error" /> : null}

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          title="API"
          value={apiReady}
          detail={health.data?.service ?? "GrowLab API"}
          icon={Activity}
          tone={apiReady === "ok" ? "success" : "warning"}
        />
        <MetricCard
          title="Active alerts"
          value={activeAlerts.length}
          detail={`Web dashboard queue ${alertTone}`}
          icon={AlertTriangle}
          tone={activeAlerts.length > 0 ? "destructive" : "success"}
        />
        <MetricCard
          title="Online devices"
          value={`${onlineDevices}/${devices.data?.length ?? 0}`}
          detail="MQTT heartbeat state"
          icon={Cpu}
          tone={onlineDevices > 0 ? "success" : "secondary"}
        />
        <MetricCard
          title="Plants"
          value={plants.data?.length ?? 0}
          detail="Tracked plant records"
          icon={Leaf}
        />
        <MetricCard
          title="Telemetry"
          value={latestReadings.data?.length ?? 0}
          detail="Latest sensor readings"
          icon={Gauge}
          tone={
            (latestReadings.data?.length ?? 0) > 0 ? "success" : "secondary"
          }
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <DataPanel title="Alerts" description="Active dashboard alerts.">
          {alerts.isLoading ? <DataNotice state="loading" /> : null}
          {alerts.isError ? <DataNotice state="error" /> : null}
          {!alerts.isLoading && !alerts.isError && activeAlerts.length === 0 ? (
            <EmptyState
              title="No active alerts"
              detail="System state is clear."
            />
          ) : null}
          {activeAlerts.length > 0 ? (
            <RowList>
              {activeAlerts.map((alert) => (
                <Row
                  key={alert.id}
                  title={alert.title}
                  detail={alert.message}
                  meta={<SeverityBadge value={alert.severity} />}
                >
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={acknowledgeMutation.isPending}
                    onClick={() => acknowledgeMutation.mutate(alert.id)}
                  >
                    Acknowledge
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={resolveMutation.isPending}
                    onClick={() => resolveMutation.mutate(alert.id)}
                  >
                    Resolve
                  </Button>
                </Row>
              ))}
            </RowList>
          ) : null}
        </DataPanel>

        <DataPanel title="Operations load" description="Current module volume.">
          <OperationsAreaChart data={operationsData} />
        </DataPanel>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <DataPanel title="Resource distribution" description="Live object mix.">
          <ResourceBarChart data={resourceData} />
        </DataPanel>

        <DataPanel title="Alert posture" description="Active alert pressure.">
          <DonutChart data={alertStatusData} />
        </DataPanel>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_2fr]">
        <DataPanel
          title="Latest telemetry"
          description="Most recent reading per sensor."
        >
          {latestReadings.isLoading ? <DataNotice state="loading" /> : null}
          {latestReadings.isError ? <DataNotice state="error" /> : null}
          {latestReadings.data && latestReadings.data.length > 0 ? (
            <RowList>
              {latestReadings.data.slice(0, 8).map((reading) => (
                <Row
                  key={`${reading.sensorId}-${reading.recordedAt}`}
                  title={reading.sensorKey}
                  detail={`${reading.deviceName} - ${reading.zoneName ?? "unassigned"} - ${formatDateTime(reading.recordedAt)}`}
                  meta={
                    <StatusBadge
                      value={formatReadingValue(
                        reading.valueDouble,
                        reading.unit,
                      )}
                    />
                  }
                />
              ))}
            </RowList>
          ) : !latestReadings.isLoading && !latestReadings.isError ? (
            <EmptyState title="No sensor readings" />
          ) : null}
        </DataPanel>

        <DataPanel
          title="Telemetry coverage"
          description="Latest readings by sensor type."
        >
          <ResourceBarChart data={telemetryTypeData} />
        </DataPanel>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <DataPanel title="Plant health" description="Manual health states.">
          <DonutChart data={plantHealthData} />
        </DataPanel>

        <DataPanel title="Device status" description="Fleet connection state.">
          <DonutChart data={deviceStatusData} />
        </DataPanel>

        <DataPanel title="Event severity" description="Recent system events.">
          <ResourceBarChart data={eventSeverityData} />
        </DataPanel>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <DataPanel title="Zones" description="Environment surfaces.">
          {zones.data && zones.data.length > 0 ? (
            <RowList>
              {zones.data.slice(0, 5).map((zone) => (
                <Row
                  key={zone.id}
                  title={zone.name}
                  detail={zone.environmentType}
                  meta={<StatusBadge value={zone.slug} />}
                />
              ))}
            </RowList>
          ) : (
            <EmptyState title="No zones" />
          )}
        </DataPanel>

        <DataPanel title="Devices" description="Controller heartbeat.">
          {devices.data && devices.data.length > 0 ? (
            <RowList>
              {devices.data.slice(0, 5).map((device) => (
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

        <DataPanel title="Recent events" description="System event stream.">
          {events.data && events.data.length > 0 ? (
            <RowList>
              {events.data.slice(0, 5).map((event) => (
                <Row
                  key={event.id}
                  title={event.eventType}
                  detail={formatDateTime(event.occurredAt)}
                  meta={<SeverityBadge value={event.severity} />}
                />
              ))}
            </RowList>
          ) : (
            <EmptyState title="No events" />
          )}
        </DataPanel>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <DataPanel title="Lighting" description="Configured lighting systems.">
          {lighting.data && lighting.data.length > 0 ? (
            <RowList>
              {lighting.data.slice(0, 4).map((system) => (
                <Row
                  key={system.id}
                  title={system.name}
                  detail={system.provider}
                  meta={
                    <StatusBadge
                      value={system.enabled ? "active" : "offline"}
                    />
                  }
                />
              ))}
            </RowList>
          ) : (
            <EmptyState title="No lighting systems" />
          )}
        </DataPanel>

        <DataPanel title="Firmware" description="Available OTA artifacts.">
          {firmware.data && firmware.data.length > 0 ? (
            <RowList>
              {firmware.data.slice(0, 4).map((version) => (
                <Row
                  key={version.id}
                  title={version.version}
                  detail={version.deviceType}
                  meta={<StatusBadge value="pending" />}
                />
              ))}
            </RowList>
          ) : (
            <EmptyState title="No firmware versions" />
          )}
        </DataPanel>
      </section>
    </div>
  );
}

function formatReadingValue(value: number, unit: string) {
  const formatted = Number.isFinite(value) ? value.toFixed(1) : String(value);
  return `${formatted}${unit}`;
}
