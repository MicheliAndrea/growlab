"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PlusCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ZoneProfileCreateRequest } from "@/lib/api";
import { createZoneProfileEntry, queryKeys } from "@/lib/queries";

const defaultTargetConfig = JSON.stringify(
  { temperature: {}, humidity: {} },
  null,
  2,
);
const defaultMetadata = JSON.stringify({}, null, 2);

export function ZoneProfileForm({ zoneId }: { zoneId: string }) {
  const queryClient = useQueryClient();
  const [name, setName] = React.useState("");
  const [isActive, setIsActive] = React.useState(true);
  const [targetConfig, setTargetConfig] = React.useState(defaultTargetConfig);
  const [metadata, setMetadata] = React.useState(defaultMetadata);
  const [formError, setFormError] = React.useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (request: ZoneProfileCreateRequest) =>
      createZoneProfileEntry(zoneId, request),
    onSuccess: async () => {
      setName("");
      setIsActive(true);
      setTargetConfig(defaultTargetConfig);
      setMetadata(defaultMetadata);
      setFormError(null);
      await queryClient.invalidateQueries({
        queryKey: queryKeys.zoneProfiles(zoneId),
      });
    },
  });

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedName = name.trim();
    if (!trimmedName) {
      setFormError("Profile name is required.");
      return;
    }

    try {
      const request: ZoneProfileCreateRequest = {
        name: trimmedName,
        isActive,
        targetConfig: parseRequiredJsonObject(targetConfig, "target config"),
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
          <Label htmlFor="zone-profile-name">Name</Label>
          <Input
            id="zone-profile-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="mt-2"
            placeholder="Vegetative day"
          />
        </div>
        <div className="flex items-end">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(event) => setIsActive(event.target.checked)}
              className="h-4 w-4 rounded border-input"
            />
            Active
          </label>
        </div>
      </div>

      <div>
        <Label htmlFor="zone-profile-targets">Target config</Label>
        <Textarea
          id="zone-profile-targets"
          value={targetConfig}
          onChange={(event) => setTargetConfig(event.target.value)}
          className="mt-2 min-h-40 font-mono text-xs"
        />
      </div>

      <div>
        <Label htmlFor="zone-profile-metadata">Metadata</Label>
        <Textarea
          id="zone-profile-metadata"
          value={metadata}
          onChange={(event) => setMetadata(event.target.value)}
          className="mt-2 min-h-28 font-mono text-xs"
        />
      </div>

      <Button disabled={mutation.isPending} type="submit">
        <PlusCircle className="h-4 w-4" aria-hidden="true" />
        Add profile
      </Button>
    </form>
  );
}

function parseRequiredJsonObject(value: string, label: string) {
  const trimmed = value.trim();
  const parsed = JSON.parse(trimmed || "{}") as unknown;
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`${label} must be a JSON object.`);
  }

  return parsed as Record<string, unknown>;
}

function parseOptionalJsonObject(value: string, label: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  return parseRequiredJsonObject(trimmed, label);
}
