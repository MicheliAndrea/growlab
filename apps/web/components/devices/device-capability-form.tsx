"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PlusCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type {
  Device,
  DeviceCapabilityCreateRequest,
  DeviceCapabilityCreateRequestCapabilityType,
} from "@/lib/api";
import { createDeviceCapabilityEntry, queryKeys } from "@/lib/queries";

const selectClass =
  "mt-2 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const capabilityTypes: DeviceCapabilityCreateRequestCapabilityType[] = [
  "sensor",
  "actuator",
  "connectivity",
  "firmware",
  "config",
];

export function DeviceCapabilityForm({ devices }: { devices: Device[] }) {
  const queryClient = useQueryClient();
  const [deviceId, setDeviceId] = React.useState("");
  const [capabilityKey, setCapabilityKey] = React.useState("");
  const [capabilityType, setCapabilityType] =
    React.useState<DeviceCapabilityCreateRequestCapabilityType>("sensor");
  const [enabled, setEnabled] = React.useState(true);
  const [config, setConfig] = React.useState("{}");
  const [metadata, setMetadata] = React.useState("{}");
  const [formError, setFormError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!deviceId && devices[0]) {
      setDeviceId(devices[0].id);
    }
  }, [deviceId, devices]);

  const mutation = useMutation({
    mutationFn: (request: DeviceCapabilityCreateRequest) =>
      createDeviceCapabilityEntry(deviceId, request),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.deviceCapabilities(deviceId),
      });
      setCapabilityKey("");
      setCapabilityType("sensor");
      setEnabled(true);
      setConfig("{}");
      setMetadata("{}");
      setFormError(null);
    },
  });

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!deviceId) {
      setFormError("Select a device before creating a capability.");
      return;
    }
    if (!capabilityKey.trim()) {
      setFormError("Capability key is required.");
      return;
    }

    try {
      mutation.mutate({
        capabilityKey: capabilityKey.trim(),
        capabilityType,
        enabled,
        config: parseJsonObject(config, "config"),
        metadata: parseJsonObject(metadata, "metadata"),
      });
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Invalid payload");
    }
  }

  if (devices.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
        Register a device before adding manual capabilities.
      </div>
    );
  }

  return (
    <form className="grid gap-4" onSubmit={handleSubmit}>
      {formError ? (
        <p className="text-xs text-red-600 dark:text-red-300">{formError}</p>
      ) : null}
      {mutation.error ? (
        <p className="text-xs text-red-600 dark:text-red-300">
          {mutation.error.message}
        </p>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <Label htmlFor="capability-device">Device</Label>
          <select
            id="capability-device"
            className={selectClass}
            value={deviceId}
            onChange={(event) => setDeviceId(event.target.value)}
          >
            {devices.map((device) => (
              <option key={device.id} value={device.id}>
                {device.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="capability-type">Type</Label>
          <select
            id="capability-type"
            className={selectClass}
            value={capabilityType}
            onChange={(event) =>
              setCapabilityType(
                event.target
                  .value as DeviceCapabilityCreateRequestCapabilityType,
              )
            }
          >
            {capabilityTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <Label htmlFor="capability-key">Capability key</Label>
          <Input
            id="capability-key"
            value={capabilityKey}
            onChange={(event) => setCapabilityKey(event.target.value)}
            placeholder="soil_moisture"
            className="mt-2"
          />
        </div>
        <label className="flex h-9 items-center gap-2 text-sm">
          <input
            checked={enabled}
            onChange={(event) => setEnabled(event.target.checked)}
            type="checkbox"
          />
          Enabled
        </label>
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        <div>
          <Label htmlFor="capability-config">Config</Label>
          <Textarea
            id="capability-config"
            value={config}
            onChange={(event) => setConfig(event.target.value)}
            className="mt-2 min-h-28 font-mono text-xs"
          />
        </div>
        <div>
          <Label htmlFor="capability-metadata">Metadata</Label>
          <Textarea
            id="capability-metadata"
            value={metadata}
            onChange={(event) => setMetadata(event.target.value)}
            className="mt-2 min-h-28 font-mono text-xs"
          />
        </div>
      </div>

      <Button disabled={mutation.isPending} type="submit">
        <PlusCircle className="h-4 w-4" aria-hidden="true" />
        Add capability
      </Button>
    </form>
  );
}

function parseJsonObject(value: string, label: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return {};
  }

  const parsed = JSON.parse(trimmed) as unknown;
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`${label} must be a JSON object.`);
  }

  return parsed as Record<string, unknown>;
}
