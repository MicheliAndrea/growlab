"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PlusCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type {
  LightingProfileCreateRequest,
  LightingProfileStepCreateRequest,
  LightingProfileStepCreateRequestAction,
  LightingSystem,
  Zone,
} from "@/lib/api";
import { createLightingProfileEntry, queryKeys } from "@/lib/queries";

const defaultSteps = JSON.stringify(
  [
    {
      stepOrder: 1,
      atTime: "08:00",
      action: "on",
      metadata: {},
    },
    {
      stepOrder: 2,
      atTime: "20:00",
      action: "off",
      metadata: {},
    },
  ],
  null,
  2,
);

const defaultMetadata = JSON.stringify({}, null, 2);
const selectClass =
  "mt-2 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function LightingProfileForm({
  zones,
  systems,
}: {
  zones: Zone[];
  systems: LightingSystem[];
}) {
  const queryClient = useQueryClient();
  const [zoneId, setZoneId] = React.useState(zones[0]?.id ?? "");
  const [lightingSystemId, setLightingSystemId] = React.useState("");
  const [name, setName] = React.useState("");
  const [enabled, setEnabled] = React.useState(true);
  const [isDefault, setIsDefault] = React.useState(false);
  const [timezone, setTimezone] = React.useState("Europe/Rome");
  const [steps, setSteps] = React.useState(defaultSteps);
  const [metadata, setMetadata] = React.useState(defaultMetadata);
  const [formError, setFormError] = React.useState<string | null>(null);
  const preview = React.useMemo(() => simulateSchedule(steps), [steps]);

  React.useEffect(() => {
    if (!zoneId && zones[0]?.id) {
      setZoneId(zones[0].id);
    }
  }, [zoneId, zones]);

  const mutation = useMutation({
    mutationFn: (request: LightingProfileCreateRequest) =>
      createLightingProfileEntry(request),
    onSuccess: async (profile) => {
      setName("");
      setEnabled(true);
      setIsDefault(false);
      setTimezone("Europe/Rome");
      setSteps(defaultSteps);
      setMetadata(defaultMetadata);
      setFormError(null);
      await queryClient.invalidateQueries({
        queryKey: queryKeys.lightingProfiles(),
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.lightingProfiles(profile.zoneId),
      });
    },
  });

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedName = name.trim();
    if (!zoneId || !trimmedName) {
      setFormError("Zone and name are required.");
      return;
    }

    try {
      const request: LightingProfileCreateRequest = {
        zoneId,
        lightingSystemId: lightingSystemId || null,
        name: trimmedName,
        enabled,
        isDefault,
        timezone: timezone.trim() || "Europe/Rome",
        steps: parseSteps(steps),
        metadata: parseOptionalJsonObject(metadata, "metadata"),
      };

      setFormError(null);
      mutation.mutate(request);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Invalid payload");
    }
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
          <Label htmlFor="lighting-zone">Zone</Label>
          <select
            id="lighting-zone"
            className={selectClass}
            value={zoneId}
            onChange={(event) => setZoneId(event.target.value)}
          >
            <option value="">Select zone</option>
            {zones.map((zone) => (
              <option key={zone.id} value={zone.id}>
                {zone.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="lighting-system">Lighting system</Label>
          <select
            id="lighting-system"
            className={selectClass}
            value={lightingSystemId}
            onChange={(event) => setLightingSystemId(event.target.value)}
          >
            <option value="">Zone only</option>
            {systems.map((system) => (
              <option key={system.id} value={system.id}>
                {system.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div>
          <Label htmlFor="lighting-name">Name</Label>
          <Input
            id="lighting-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="mt-2"
          />
        </div>
        <div>
          <Label htmlFor="lighting-timezone">Timezone</Label>
          <Input
            id="lighting-timezone"
            value={timezone}
            onChange={(event) => setTimezone(event.target.value)}
            className="mt-2"
          />
        </div>
        <div className="flex flex-wrap items-end gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(event) => setEnabled(event.target.checked)}
              className="h-4 w-4 rounded border-input"
            />
            Enabled
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(event) => setIsDefault(event.target.checked)}
              className="h-4 w-4 rounded border-input"
            />
            Default
          </label>
        </div>
      </div>

      <div>
        <Label htmlFor="lighting-steps">Steps JSON</Label>
        <Textarea
          id="lighting-steps"
          value={steps}
          onChange={(event) => setSteps(event.target.value)}
          className="mt-2 min-h-56 font-mono text-xs"
        />
      </div>

      <div className="grid gap-2">
        <div className="text-sm font-medium">24h simulation</div>
        <div
          className="grid gap-1"
          style={{ gridTemplateColumns: "repeat(24, minmax(0, 1fr))" }}
        >
          {preview.map((value, index) => (
            <div
              key={`${index}-${value}`}
              className="flex h-10 items-end rounded-sm bg-muted"
              title={`${String(index).padStart(2, "0")}:00 - ${value}%`}
            >
              <div
                className="w-full rounded-sm bg-primary"
                style={{ height: `${Math.max(6, value)}%` }}
              />
            </div>
          ))}
        </div>
      </div>

      <div>
        <Label htmlFor="lighting-metadata">Metadata</Label>
        <Textarea
          id="lighting-metadata"
          value={metadata}
          onChange={(event) => setMetadata(event.target.value)}
          className="mt-2 min-h-24 font-mono text-xs"
        />
      </div>

      <Button disabled={mutation.isPending} type="submit">
        <PlusCircle className="h-4 w-4" aria-hidden="true" />
        Create profile
      </Button>
    </form>
  );
}

function parseSteps(value: string): LightingProfileStepCreateRequest[] {
  const parsed = JSON.parse(value.trim() || "[]") as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error("steps must be a JSON array.");
  }

  return parsed.map((step, index) => {
    if (step === null || typeof step !== "object" || Array.isArray(step)) {
      throw new Error(`step ${index + 1} must be a JSON object.`);
    }

    const item = step as Partial<LightingProfileStepCreateRequest> & {
      action?: LightingProfileStepCreateRequestAction;
    };
    if (!item.atTime || !item.action) {
      throw new Error(`step ${index + 1} must include atTime and action.`);
    }

    return {
      stepOrder: item.stepOrder ?? index + 1,
      atTime: item.atTime,
      action: item.action,
      brightnessPercent: item.brightnessPercent,
      transitionSeconds: item.transitionSeconds,
      metadata: item.metadata,
    };
  });
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

function simulateSchedule(value: string) {
  try {
    const steps = parseSteps(value);
    const sorted = [...steps].sort(
      (left, right) => left.stepOrder - right.stepOrder,
    );
    const hours = Array.from({ length: 24 }, (_, hour) => {
      const currentMinutes = hour * 60;
      let brightness = 0;

      for (const step of sorted) {
        const [stepHour, stepMinute = "0"] = step.atTime.split(":");
        const stepMinutes = Number(stepHour) * 60 + Number(stepMinute);
        if (currentMinutes >= stepMinutes) {
          if (step.action === "off") {
            brightness = 0;
          } else if (step.action === "on") {
            brightness = step.brightnessPercent ?? 100;
          } else if (step.action === "brightness") {
            brightness = step.brightnessPercent ?? brightness;
          }
        }
      }

      return brightness;
    });

    return hours;
  } catch {
    return Array.from({ length: 24 }, () => 0);
  }
}
