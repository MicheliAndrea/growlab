"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, PlayCircle } from "lucide-react";

import {
  EmptyState,
  formatDateTime,
  DataPanel,
  Row,
  RowList,
  StatusBadge,
} from "@/components/dashboard/ui";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { Device, FirmwareVersion, OtaDryRun, OtaJob } from "@/lib/api";
import {
  createDeviceOtaDryRun,
  createDeviceOtaJob,
  fetchOtaJobs,
  queryKeys,
} from "@/lib/queries";

const selectClass =
  "mt-2 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const defaultMetadata = JSON.stringify({}, null, 2);

export function OtaControlPanel({
  devices,
  firmwareVersions,
}: {
  devices: Device[];
  firmwareVersions: FirmwareVersion[];
}) {
  const queryClient = useQueryClient();
  const [selectedDeviceId, setSelectedDeviceId] = React.useState("");
  const [selectedFirmwareVersionId, setSelectedFirmwareVersionId] =
    React.useState("");
  const [dryRunMetadata, setDryRunMetadata] = React.useState(defaultMetadata);
  const [lastDryRun, setLastDryRun] = React.useState<OtaDryRun | null>(null);
  const deviceId = selectedDeviceId || devices[0]?.id || "";
  const firmwareVersionId =
    selectedFirmwareVersionId || firmwareVersions[0]?.id || "";

  const jobs = useQuery({
    queryKey: deviceId ? queryKeys.otaJobs(deviceId) : ["ota-jobs", "none"],
    queryFn: () => fetchOtaJobs(deviceId),
    enabled: Boolean(deviceId),
    refetchInterval: 10_000,
  });

  const dryRunMutation = useMutation({
    mutationFn: () =>
      createDeviceOtaDryRun(deviceId, {
        firmwareVersionId,
        metadata: parseOptionalJsonObject(dryRunMetadata, "dry-run metadata"),
      }),
    onSuccess: (result) => setLastDryRun(result),
  });

  const createJobMutation = useMutation({
    mutationFn: () =>
      createDeviceOtaJob(deviceId, {
        firmwareVersionId,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.otaJobs(deviceId),
      });
    },
  });

  const selectedFirmware = firmwareVersions.find(
    (version) => version.id === firmwareVersionId,
  );
  const formDisabled = !deviceId || !firmwareVersionId;
  const reportEntries = lastDryRun
    ? renderReportEntries(lastDryRun.compatibilityReport)
    : [];

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <Label htmlFor="ota-device">Device</Label>
          <select
            className={selectClass}
            id="ota-device"
            onChange={(event) => {
              setSelectedDeviceId(event.target.value);
              setLastDryRun(null);
            }}
            value={deviceId}
          >
            <option value="">Select device</option>
            {devices.map((device) => (
              <option key={device.id} value={device.id}>
                {device.name} ({device.deviceUid})
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="ota-firmware">Firmware</Label>
          <select
            className={selectClass}
            id="ota-firmware"
            onChange={(event) => {
              setSelectedFirmwareVersionId(event.target.value);
              setLastDryRun(null);
            }}
            value={firmwareVersionId}
          >
            <option value="">Select firmware</option>
            {firmwareVersions.map((version) => (
              <option key={version.id} value={version.id}>
                {version.version} ({version.deviceType})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <Label htmlFor="ota-metadata">Dry-run metadata</Label>
        <textarea
          id="ota-metadata"
          value={dryRunMetadata}
          onChange={(event) => setDryRunMetadata(event.target.value)}
          className="mt-2 min-h-28 w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          disabled={formDisabled || dryRunMutation.isPending}
          onClick={() => dryRunMutation.mutate()}
          type="button"
          variant="outline"
        >
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          Dry-run
        </Button>
        <Button
          disabled={formDisabled || createJobMutation.isPending}
          onClick={() => createJobMutation.mutate()}
          type="button"
        >
          <PlayCircle className="h-4 w-4" aria-hidden="true" />
          Create OTA job
        </Button>
      </div>

      {dryRunMutation.error || createJobMutation.error ? (
        <p className="text-xs text-red-600 dark:text-red-300">
          {(dryRunMutation.error ?? createJobMutation.error)?.message}
        </p>
      ) : null}

      {lastDryRun ? (
        <div className="grid gap-3">
          <RowList>
            <Row
              title="Last dry-run"
              detail={selectedFirmware?.version}
              meta={<StatusBadge value={lastDryRun.status} />}
            />
            <Row
              title="Requested"
              detail={formatDateTime(lastDryRun.requestedAt)}
            />
            <Row
              title="Completed"
              detail={formatDateTime(lastDryRun.completedAt)}
            />
          </RowList>

          <DataPanel title="Compatibility report" description="Dry-run output.">
            <div className="grid gap-2">
              {reportEntries.length > 0 ? (
                reportEntries.map((entry) => (
                  <div
                    key={entry.label}
                    className="flex items-center justify-between gap-3 rounded-md bg-muted/40 px-3 py-2 text-xs"
                  >
                    <span className="font-medium capitalize">
                      {entry.label}
                    </span>
                    <span className="truncate text-muted-foreground">
                      {entry.value}
                    </span>
                  </div>
                ))
              ) : (
                <EmptyState title="Empty compatibility report" />
              )}
            </div>
          </DataPanel>
        </div>
      ) : null}

      {jobs.data && jobs.data.length > 0 ? (
        <RowList>
          {jobs.data.map((job) => (
            <Row
              key={job.id}
              title={job.id}
              detail={jobDetail(job)}
              meta={<StatusBadge value={job.status} />}
            >
              {mqttTopic(job) ? (
                <span className="max-w-full truncate text-xs text-muted-foreground">
                  {mqttTopic(job)}
                </span>
              ) : null}
            </Row>
          ))}
        </RowList>
      ) : (
        <EmptyState title="No OTA jobs" />
      )}
    </div>
  );
}

function jobDetail(job: OtaJob) {
  const completedAt = job.completedAt
    ? ` - completed ${formatDateTime(job.completedAt)}`
    : "";
  return `${formatDateTime(job.requestedAt)}${completedAt}`;
}

function mqttTopic(job: OtaJob) {
  const command = job.metadata?.mqttCommand;
  if (!command || typeof command !== "object") {
    return null;
  }
  const topic = (command as { topic?: unknown }).topic;
  return typeof topic === "string" ? topic : null;
}

function parseOptionalJsonObject(value: string, label: string) {
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

function renderReportEntries(report: Record<string, unknown>) {
  return Object.entries(report)
    .slice(0, 8)
    .map(([label, value]) => ({
      label,
      value: formatReportValue(value),
    }));
}

function formatReportValue(value: unknown) {
  if (Array.isArray(value)) {
    return `${value.length} item${value.length === 1 ? "" : "s"}`;
  }

  if (value === null || value === undefined) {
    return "unset";
  }

  if (typeof value === "object") {
    const keys = Object.keys(value as Record<string, unknown>);
    return keys.length > 0
      ? `${keys.length} field${keys.length === 1 ? "" : "s"}`
      : "{}";
  }

  return String(value);
}
