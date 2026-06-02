"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PlusCircle, Search } from "lucide-react";

import {
  DataNotice,
  EmptyState,
  formatDateTime,
  Row,
  RowList,
  StatusBadge,
} from "@/components/dashboard/ui";
import { Button } from "@/components/ui/button";
import { MiniLineChart } from "@/components/ui/chart";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type {
  SensorCalibration,
  SensorCalibrationCreateRequest,
  SensorCalibrationCreateRequestStatus,
  SensorCalibrationUpdateRequestStatus,
  SensorReading,
} from "@/lib/api";
import {
  createSensorCalibrationEntry,
  fetchSensorCalibrations,
  fetchSensorReadings,
  queryKeys,
  updateSensorCalibrationEntry,
} from "@/lib/queries";

const selectClass =
  "mt-2 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const defaultCalibrationData = JSON.stringify({ points: [] }, null, 2);
const defaultRawPoints = JSON.stringify({ points: [] }, null, 2);

export function SensorCalibrationPanel() {
  const queryClient = useQueryClient();
  const [sensorIdInput, setSensorIdInput] = React.useState("");
  const [activeSensorId, setActiveSensorId] = React.useState("");
  const [method, setMethod] = React.useState("manual-curve-fit");
  const [status, setStatus] =
    React.useState<SensorCalibrationCreateRequestStatus>("draft");
  const [dryRaw, setDryRaw] = React.useState("");
  const [wetRaw, setWetRaw] = React.useState("");
  const [currentRaw, setCurrentRaw] = React.useState("");
  const [calibrationData, setCalibrationData] = React.useState(
    defaultCalibrationData,
  );
  const [rawPoints, setRawPoints] = React.useState(defaultRawPoints);
  const [notes, setNotes] = React.useState("");
  const [formError, setFormError] = React.useState<string | null>(null);

  const calibrationsQuery = useQuery({
    queryKey: activeSensorId
      ? queryKeys.sensorCalibrations(activeSensorId)
      : ["sensor-calibrations", "none"],
    queryFn: () => fetchSensorCalibrations(activeSensorId),
    enabled: Boolean(activeSensorId),
    refetchInterval: 30_000,
  });

  const readingsQuery = useQuery({
    queryKey: activeSensorId
      ? queryKeys.sensorReadings(activeSensorId, 24, 120)
      : ["sensor-readings", "none"],
    queryFn: () => fetchSensorReadings(activeSensorId, 24, 120),
    enabled: Boolean(activeSensorId),
    refetchInterval: 30_000,
  });

  const createMutation = useMutation({
    mutationFn: (request: SensorCalibrationCreateRequest) =>
      createSensorCalibrationEntry(activeSensorId, request),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.sensorCalibrations(activeSensorId),
      });
      setFormError(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (input: {
      calibrationId: string;
      status: SensorCalibrationUpdateRequestStatus;
    }) =>
      updateSensorCalibrationEntry(activeSensorId, input.calibrationId, {
        status: input.status,
        confirmedAt:
          input.status === "confirmed" ? new Date().toISOString() : undefined,
        metadata: {
          source: "web-dashboard",
        },
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.sensorCalibrations(activeSensorId),
      });
    },
  });

  const latestCalibration = calibrationsQuery.data?.[0];
  const calibrationCount = calibrationsQuery.data?.length ?? 0;
  const readings = readingsQuery.data ?? [];
  const latestReading = readings[0];
  const chartData = React.useMemo(
    () =>
      readings
        .slice()
        .reverse()
        .map((reading) => ({
          time: formatChartTime(reading.recordedAt),
          value: reading.valueDouble,
        })),
    [readings],
  );

  function loadSensor() {
    const normalized = sensorIdInput.trim();
    if (!normalized) {
      setFormError("Insert a sensor id before loading calibrations.");
      return;
    }

    setFormError(null);
    setActiveSensorId(normalized);
  }

  function applyWizard() {
    const dryValue = parseOptionalNumber(dryRaw, "dry reading");
    const wetValue = parseOptionalNumber(wetRaw, "wet reading");
    const currentValue = parseOptionalNumber(currentRaw, "current reading");

    if (dryValue === undefined || wetValue === undefined) {
      setFormError("Dry and wet readings are required for the wizard.");
      return;
    }

    const calibration = {
      method: "dry-wet-linear",
      dryRaw: dryValue,
      wetRaw: wetValue,
      currentRaw: currentValue ?? null,
      points: [
        { label: "dry", raw: dryValue, value: 0 },
        { label: "wet", raw: wetValue, value: 100 },
        ...(currentValue === undefined
          ? []
          : [{ label: "current", raw: currentValue, value: 50 }]),
      ],
    };

    setMethod("dry-wet-linear");
    setCalibrationData(JSON.stringify(calibration, null, 2));
    setRawPoints(
      JSON.stringify(
        {
          dry: dryValue,
          wet: wetValue,
          current: currentValue ?? null,
        },
        null,
        2,
      ),
    );
    setFormError(null);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!activeSensorId) {
      setFormError("Load a sensor id before creating a calibration.");
      return;
    }

    try {
      const parsedCalibrationData = parseJsonObject(
        calibrationData,
        "calibration data",
      );
      const parsedRawPoints = parseJsonObject(rawPoints, "raw points");

      const request: SensorCalibrationCreateRequest = {
        method: method.trim(),
        status,
        calibrationData: parsedCalibrationData,
        rawPoints: parsedRawPoints,
        notes: notes.trim() ? notes.trim() : undefined,
        metadata: {
          source: "web-dashboard",
        },
      };

      setFormError(null);
      createMutation.mutate(request, {
        onSuccess: () => {
          setCalibrationData(defaultCalibrationData);
          setRawPoints(defaultRawPoints);
          setNotes("");
          setMethod("manual-curve-fit");
          setStatus("draft");
        },
      });
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Invalid calibration payload",
      );
    }
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 md:grid-cols-[1fr_auto]">
        <div>
          <Label htmlFor="sensor-id">Sensor ID</Label>
          <Input
            id="sensor-id"
            placeholder="Paste a sensor UUID"
            value={sensorIdInput}
            onChange={(event) => setSensorIdInput(event.target.value)}
            className="mt-2"
          />
        </div>
        <div className="flex items-end">
          <Button type="button" onClick={loadSensor} variant="outline">
            <Search className="h-4 w-4" aria-hidden="true" />
            Load sensor
          </Button>
        </div>
      </div>

      {formError ? (
        <p className="text-xs text-red-600 dark:text-red-300">{formError}</p>
      ) : null}

      <div className="grid gap-3 rounded-md border border-border bg-muted/30 p-3">
        <div className="text-sm font-medium">Calibration wizard</div>
        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <Label htmlFor="wizard-dry">Dry reading</Label>
            <Input
              id="wizard-dry"
              inputMode="decimal"
              type="number"
              value={dryRaw}
              onChange={(event) => setDryRaw(event.target.value)}
              className="mt-2"
            />
          </div>
          <div>
            <Label htmlFor="wizard-wet">Wet reading</Label>
            <Input
              id="wizard-wet"
              inputMode="decimal"
              type="number"
              value={wetRaw}
              onChange={(event) => setWetRaw(event.target.value)}
              className="mt-2"
            />
          </div>
          <div>
            <Label htmlFor="wizard-current">Current reading</Label>
            <Input
              id="wizard-current"
              inputMode="decimal"
              type="number"
              value={currentRaw}
              onChange={(event) => setCurrentRaw(event.target.value)}
              className="mt-2"
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={applyWizard}>
            Build calibration payload
          </Button>
        </div>
      </div>

      <form className="grid gap-4" onSubmit={handleSubmit}>
        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <Label htmlFor="calibration-method">Method</Label>
            <Input
              id="calibration-method"
              value={method}
              onChange={(event) => setMethod(event.target.value)}
              className="mt-2"
            />
          </div>
          <div>
            <Label htmlFor="calibration-status">Status</Label>
            <select
              className={selectClass}
              id="calibration-status"
              value={status}
              onChange={(event) =>
                setStatus(
                  event.target.value as SensorCalibrationCreateRequestStatus,
                )
              }
            >
              <option value="draft">draft</option>
              <option value="confirmed">confirmed</option>
            </select>
          </div>
          <div className="flex items-end text-sm text-muted-foreground">
            {activeSensorId
              ? `Loaded sensor ${activeSensorId}`
              : "No sensor loaded"}
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <div>
            <Label htmlFor="calibration-data">Calibration data</Label>
            <Textarea
              id="calibration-data"
              value={calibrationData}
              onChange={(event) => setCalibrationData(event.target.value)}
              className="mt-2 min-h-36 font-mono text-xs"
            />
          </div>
          <div>
            <Label htmlFor="raw-points">Raw points</Label>
            <Textarea
              id="raw-points"
              value={rawPoints}
              onChange={(event) => setRawPoints(event.target.value)}
              className="mt-2 min-h-36 font-mono text-xs"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="calibration-notes">Notes</Label>
          <Textarea
            id="calibration-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className="mt-2 min-h-24"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="submit"
            disabled={!activeSensorId || createMutation.isPending}
          >
            <PlusCircle className="h-4 w-4" aria-hidden="true" />
            Save calibration
          </Button>
        </div>

        {createMutation.error ? (
          <p className="text-xs text-red-600 dark:text-red-300">
            {createMutation.error.message}
          </p>
        ) : null}
      </form>

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <div>
          {activeSensorId ? (
            <>
              {calibrationsQuery.isLoading ? (
                <DataNotice state="loading" />
              ) : null}
              {calibrationsQuery.isError ? <DataNotice state="error" /> : null}
              {updateMutation.error ? (
                <p className="text-xs text-red-600 dark:text-red-300">
                  {updateMutation.error.message}
                </p>
              ) : null}
              {!calibrationsQuery.isLoading &&
              !calibrationsQuery.isError &&
              calibrationCount === 0 ? (
                <EmptyState
                  title="No calibrations"
                  detail="Save the first calibration for this sensor."
                />
              ) : null}
              {calibrationCount > 0 ? (
                <RowList>
                  {calibrationsQuery.data?.map((calibration) => (
                    <CalibrationRow
                      key={calibration.id}
                      calibration={calibration}
                      isPending={updateMutation.isPending}
                      onStatusChange={(status) =>
                        updateMutation.mutate({
                          calibrationId: calibration.id,
                          status,
                        })
                      }
                    />
                  ))}
                </RowList>
              ) : null}
            </>
          ) : (
            <EmptyState
              title="Load a sensor id"
              detail="Paste a sensor UUID to inspect or create calibrations."
            />
          )}
        </div>

        <div className="grid gap-4">
          <RowList>
            <Row
              title="Calibration count"
              detail={activeSensorId || "No sensor selected"}
              meta={<StatusBadge value={String(calibrationCount)} />}
            />
            <Row
              title="Latest method"
              detail={latestCalibration?.method ?? "not set"}
              meta={<StatusBadge value={latestCalibration?.status} />}
            />
            <Row
              title="Confirmed at"
              detail={formatDateTime(latestCalibration?.confirmedAt)}
              meta={
                <StatusBadge value={latestCalibration?.status ?? "draft"} />
              }
            />
          </RowList>

          <div className="grid gap-3 rounded-md border border-border p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-sm font-medium">Recent readings</div>
                <div className="text-xs text-muted-foreground">
                  Last 24 hours, capped at 120 samples.
                </div>
              </div>
              <StatusBadge value={latestReading ? "active" : "empty"} />
            </div>

            {activeSensorId ? (
              <>
                {readingsQuery.isLoading ? (
                  <DataNotice state="loading" />
                ) : null}
                {readingsQuery.isError ? <DataNotice state="error" /> : null}
                {!readingsQuery.isLoading &&
                !readingsQuery.isError &&
                readings.length === 0 ? (
                  <EmptyState
                    title="No readings"
                    detail="The sensor has no telemetry in the selected window."
                  />
                ) : null}
                {readings.length > 0 ? (
                  <>
                    <div className="h-[120px]">
                      <MiniLineChart data={chartData} />
                    </div>
                    <RowList>
                      {readings.slice(0, 4).map((reading) => (
                        <ReadingRow key={reading.id} reading={reading} />
                      ))}
                    </RowList>
                  </>
                ) : null}
              </>
            ) : (
              <EmptyState
                title="Load a sensor id"
                detail="Recent telemetry will appear after the sensor is loaded."
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function CalibrationRow({
  calibration,
  isPending,
  onStatusChange,
}: {
  calibration: SensorCalibration;
  isPending: boolean;
  onStatusChange: (status: SensorCalibrationUpdateRequestStatus) => void;
}) {
  return (
    <Row
      title={calibration.method}
      detail={`${formatDateTime(calibration.createdAt)} - ${summary(calibration.notes)}`}
      meta={<StatusBadge value={calibration.status} />}
    >
      <div className="max-w-full truncate text-xs text-muted-foreground">
        {summary(calibration.calibrationData)}
      </div>
      {calibration.status !== "confirmed" ? (
        <Button
          disabled={isPending}
          onClick={() => onStatusChange("confirmed")}
          size="sm"
          variant="outline"
        >
          Confirm
        </Button>
      ) : null}
      {calibration.status !== "retired" ? (
        <Button
          disabled={isPending}
          onClick={() => onStatusChange("retired")}
          size="sm"
          variant="secondary"
        >
          Retire
        </Button>
      ) : (
        <Button
          disabled={isPending}
          onClick={() => onStatusChange("draft")}
          size="sm"
          variant="outline"
        >
          Reopen
        </Button>
      )}
    </Row>
  );
}

function ReadingRow({ reading }: { reading: SensorReading }) {
  return (
    <Row
      title={formatReadingValue(reading.valueDouble, reading.unit)}
      detail={`${reading.sensorKey} - ${formatDateTime(reading.recordedAt)}`}
      meta={<StatusBadge value={reading.sensorType} />}
    />
  );
}

function parseJsonObject(value: string, label: string) {
  const parsed = JSON.parse(value) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`${label} must be a JSON object.`);
  }
  return parsed as Record<string, unknown>;
}

function parseOptionalNumber(value: string, label: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  const parsed = Number(trimmed);
  if (Number.isNaN(parsed)) {
    throw new Error(`${label} must be a number.`);
  }

  return parsed;
}

function formatReadingValue(value: number, unit?: string | null) {
  const normalized = Number.isInteger(value) ? String(value) : value.toFixed(2);
  return unit ? `${normalized} ${unit}` : normalized;
}

function formatChartTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function summary(value: unknown) {
  if (value == null) {
    return "not set";
  }

  if (typeof value === "string") {
    return value || "not set";
  }

  try {
    const text = JSON.stringify(value);
    if (!text) {
      return "not set";
    }
    return text.length > 72 ? `${text.slice(0, 69)}...` : text;
  } catch {
    return "not set";
  }
}
