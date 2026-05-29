"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, PlusCircle, RefreshCcw } from "lucide-react";

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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  acknowledgeSystemAlertEntry,
  createSystemAlertEntry,
  createSystemEventEntry,
  fetchSystemAlerts,
  fetchSystemEvents,
  queryKeys,
  resolveSystemAlertEntry,
} from "@/lib/queries";
import {
  type SystemAlert,
  type SystemAlertCreateRequest,
  type SystemAlertTransitionRequest,
  type SystemAlertStatus,
  type SystemEventCreateRequest,
  type SystemSeverity,
} from "@/lib/api";

const poll = 30_000;
const selectClass =
  "mt-2 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const severityOptions: SystemSeverity[] = [
  "info",
  "warning",
  "error",
  "critical",
];

export function OperationsConsole() {
  const queryClient = useQueryClient();
  const activeAlerts = useQuery({
    queryKey: queryKeys.systemAlerts("active"),
    queryFn: () => fetchSystemAlerts("active"),
    refetchInterval: 15_000,
  });
  const events = useQuery({
    queryKey: queryKeys.systemEvents,
    queryFn: fetchSystemEvents,
    refetchInterval: poll,
  });

  const alertCount = activeAlerts.data?.length ?? 0;
  const eventCount = events.data?.length ?? 0;
  const criticalCount =
    events.data?.filter((event) => event.severity === "critical").length ?? 0;

  const acknowledgeMutation = useMutation({
    mutationFn: (id: string) =>
      acknowledgeSystemAlertEntry(id, { changedBy: "web-operations" }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["system-alerts"] });
      await queryClient.invalidateQueries({ queryKey: queryKeys.systemEvents });
    },
  });

  const resolveMutation = useMutation({
    mutationFn: (id: string) =>
      resolveSystemAlertEntry(id, { changedBy: "web-operations" }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["system-alerts"] });
      await queryClient.invalidateQueries({ queryKey: queryKeys.systemEvents });
    },
  });

  const createAlertMutation = useMutation({
    mutationFn: (request: SystemAlertCreateRequest) =>
      createSystemAlertEntry(request),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["system-alerts"] });
      await queryClient.invalidateQueries({ queryKey: queryKeys.systemEvents });
    },
  });

  const createEventMutation = useMutation({
    mutationFn: (request: SystemEventCreateRequest) =>
      createSystemEventEntry(request),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.systemEvents });
    },
  });

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Operations"
        title="System Operations"
        description="Manual alerts, manual events and the active alert queue."
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
          title="Active alerts"
          value={alertCount}
          detail="Alerts requiring attention"
          icon={CheckCircle2}
          tone={alertCount > 0 ? "destructive" : "success"}
        />
        <MetricCard
          title="Events"
          value={eventCount}
          detail="Recent system events"
          icon={CheckCircle2}
        />
        <MetricCard
          title="Critical"
          value={criticalCount}
          detail="Critical event severity"
          icon={CheckCircle2}
          tone={criticalCount > 0 ? "warning" : "success"}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <DataPanel title="Create alert" description="Manual alert injection.">
          <SystemAlertForm
            onSubmit={createAlertMutation.mutate}
            isPending={createAlertMutation.isPending}
            error={createAlertMutation.error}
          />
        </DataPanel>

        <DataPanel title="Create event" description="Manual event logging.">
          <SystemEventForm
            onSubmit={createEventMutation.mutate}
            isPending={createEventMutation.isPending}
            error={createEventMutation.error}
          />
        </DataPanel>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_1.1fr]">
        <DataPanel title="Active alerts" description="Current alert queue.">
          {activeAlerts.isLoading ? <DataNotice state="loading" /> : null}
          {activeAlerts.isError ? <DataNotice state="error" /> : null}
          {activeAlerts.data && activeAlerts.data.length > 0 ? (
            <RowList>
              {activeAlerts.data.map((alert) => (
                <Row
                  key={alert.id}
                  title={alert.title}
                  detail={`${alert.source} - ${alert.message}`}
                  meta={<SeverityBadge value={alert.severity} />}
                >
                  <StatusBadge value={alert.status} />
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
          ) : !activeAlerts.isLoading && !activeAlerts.isError ? (
            <EmptyState
              title="No active alerts"
              detail="Manual alert creation appears above."
            />
          ) : null}
        </DataPanel>

        <DataPanel title="Recent events" description="Event stream.">
          {events.isLoading ? <DataNotice state="loading" /> : null}
          {events.isError ? <DataNotice state="error" /> : null}
          {events.data && events.data.length > 0 ? (
            <RowList>
              {events.data.slice(0, 12).map((event) => (
                <Row
                  key={event.id}
                  title={event.eventType}
                  detail={`${event.source} - ${event.message}`}
                  meta={<SeverityBadge value={event.severity} />}
                >
                  <span className="text-xs text-muted-foreground">
                    {formatDateTime(event.occurredAt)}
                  </span>
                </Row>
              ))}
            </RowList>
          ) : !events.isLoading && !events.isError ? (
            <EmptyState
              title="No system events"
              detail="Manual events appear above."
            />
          ) : null}
        </DataPanel>
      </section>
    </div>
  );
}

function SystemAlertForm({
  onSubmit,
  isPending,
  error,
}: {
  onSubmit: (request: SystemAlertCreateRequest) => void;
  isPending: boolean;
  error: unknown;
}) {
  const [severity, setSeverity] = React.useState<SystemSeverity>("warning");
  const [source, setSource] = React.useState("web-operations");
  const [title, setTitle] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [metadata, setMetadata] = React.useState("{}");
  const [formError, setFormError] = React.useState<string | null>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedTitle = title.trim();
    const trimmedMessage = message.trim();
    if (!trimmedTitle || !trimmedMessage) {
      setFormError("Title and message are required.");
      return;
    }

    try {
      const request: SystemAlertCreateRequest = {
        severity,
        source: source.trim() || "web-operations",
        title: trimmedTitle,
        message: trimmedMessage,
        metadata: parseJsonObject(metadata, "metadata"),
      };

      setFormError(null);
      onSubmit(request);
      setTitle("");
      setMessage("");
      setMetadata("{}");
      setSeverity("warning");
      setSource("web-operations");
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Invalid payload");
    }
  }

  return (
    <form className="grid gap-4" onSubmit={handleSubmit}>
      {formError ? (
        <p className="text-xs text-red-600 dark:text-red-300">{formError}</p>
      ) : null}
      {error instanceof Error ? (
        <p className="text-xs text-red-600 dark:text-red-300">
          {error.message}
        </p>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <Label htmlFor="alert-title">Title</Label>
          <Input
            id="alert-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="mt-2"
          />
        </div>
        <div>
          <Label htmlFor="alert-severity">Severity</Label>
          <select
            id="alert-severity"
            className={selectClass}
            value={severity}
            onChange={(event) =>
              setSeverity(event.target.value as SystemSeverity)
            }
          >
            {severityOptions.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <Label htmlFor="alert-source">Source</Label>
        <Input
          id="alert-source"
          value={source}
          onChange={(event) => setSource(event.target.value)}
          className="mt-2"
        />
      </div>

      <div>
        <Label htmlFor="alert-message">Message</Label>
        <Textarea
          id="alert-message"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          className="mt-2 min-h-28"
        />
      </div>

      <div>
        <Label htmlFor="alert-metadata">Metadata</Label>
        <Textarea
          id="alert-metadata"
          value={metadata}
          onChange={(event) => setMetadata(event.target.value)}
          className="mt-2 min-h-24 font-mono text-xs"
        />
      </div>

      <Button disabled={isPending} type="submit">
        <PlusCircle className="h-4 w-4" aria-hidden="true" />
        Create alert
      </Button>
    </form>
  );
}

function SystemEventForm({
  onSubmit,
  isPending,
  error,
}: {
  onSubmit: (request: SystemEventCreateRequest) => void;
  isPending: boolean;
  error: unknown;
}) {
  const [eventType, setEventType] = React.useState("manual_note");
  const [severity, setSeverity] = React.useState<SystemSeverity>("info");
  const [source, setSource] = React.useState("web-operations");
  const [zoneId, setZoneId] = React.useState("");
  const [plantId, setPlantId] = React.useState("");
  const [deviceId, setDeviceId] = React.useState("");
  const [alertId, setAlertId] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [occurredAt, setOccurredAt] = React.useState("");
  const [metadata, setMetadata] = React.useState("{}");
  const [formError, setFormError] = React.useState<string | null>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedEventType = eventType.trim();
    const trimmedMessage = message.trim();
    if (!trimmedEventType || !trimmedMessage) {
      setFormError("Event type and message are required.");
      return;
    }

    try {
      const request: SystemEventCreateRequest = {
        eventType: trimmedEventType,
        severity,
        source: source.trim() || "web-operations",
        zoneId: zoneId.trim() || null,
        plantId: plantId.trim() || null,
        deviceId: deviceId.trim() || null,
        alertId: alertId.trim() || null,
        message: trimmedMessage,
        metadata: parseJsonObject(metadata, "metadata"),
        occurredAt: occurredAt ? new Date(occurredAt).toISOString() : null,
      };

      setFormError(null);
      onSubmit(request);
      setEventType("manual_note");
      setSeverity("info");
      setSource("web-operations");
      setZoneId("");
      setPlantId("");
      setDeviceId("");
      setAlertId("");
      setMessage("");
      setOccurredAt("");
      setMetadata("{}");
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Invalid payload");
    }
  }

  return (
    <form className="grid gap-4" onSubmit={handleSubmit}>
      {formError ? (
        <p className="text-xs text-red-600 dark:text-red-300">{formError}</p>
      ) : null}
      {error instanceof Error ? (
        <p className="text-xs text-red-600 dark:text-red-300">
          {error.message}
        </p>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <Label htmlFor="event-type">Event type</Label>
          <Input
            id="event-type"
            value={eventType}
            onChange={(event) => setEventType(event.target.value)}
            className="mt-2"
          />
        </div>
        <div>
          <Label htmlFor="event-severity">Severity</Label>
          <select
            id="event-severity"
            className={selectClass}
            value={severity}
            onChange={(event) =>
              setSeverity(event.target.value as SystemSeverity)
            }
          >
            {severityOptions.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <Label htmlFor="event-source">Source</Label>
        <Input
          id="event-source"
          value={source}
          onChange={(event) => setSource(event.target.value)}
          className="mt-2"
        />
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div>
          <Label htmlFor="event-zone">Zone ID</Label>
          <Input
            id="event-zone"
            value={zoneId}
            onChange={(event) => setZoneId(event.target.value)}
            className="mt-2"
          />
        </div>
        <div>
          <Label htmlFor="event-plant">Plant ID</Label>
          <Input
            id="event-plant"
            value={plantId}
            onChange={(event) => setPlantId(event.target.value)}
            className="mt-2"
          />
        </div>
        <div>
          <Label htmlFor="event-device">Device ID</Label>
          <Input
            id="event-device"
            value={deviceId}
            onChange={(event) => setDeviceId(event.target.value)}
            className="mt-2"
          />
        </div>
        <div>
          <Label htmlFor="event-alert">Alert ID</Label>
          <Input
            id="event-alert"
            value={alertId}
            onChange={(event) => setAlertId(event.target.value)}
            className="mt-2"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="event-message">Message</Label>
        <Textarea
          id="event-message"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          className="mt-2 min-h-28"
        />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <Label htmlFor="event-occurred-at">Occurred at</Label>
          <Input
            id="event-occurred-at"
            type="datetime-local"
            value={occurredAt}
            onChange={(event) => setOccurredAt(event.target.value)}
            className="mt-2"
          />
        </div>
        <div>
          <Label htmlFor="event-metadata">Metadata</Label>
          <Textarea
            id="event-metadata"
            value={metadata}
            onChange={(event) => setMetadata(event.target.value)}
            className="mt-2 min-h-28 font-mono text-xs"
          />
        </div>
      </div>

      <Button disabled={isPending} type="submit">
        <PlusCircle className="h-4 w-4" aria-hidden="true" />
        Create event
      </Button>
    </form>
  );
}

function parseJsonObject(value: string, label: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  const parsed = JSON.parse(trimmed) as unknown;
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`${label} must be a JSON object.`);
  }

  return parsed as Record<string, unknown>;
}
