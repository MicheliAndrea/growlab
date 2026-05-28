"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { UploadCloud } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { FirmwareChannel } from "@/lib/api";
import { queryKeys, uploadFirmwareVersion } from "@/lib/queries";

const selectClass =
  "mt-2 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function FirmwareUploadForm({
  channels,
}: {
  channels: FirmwareChannel[];
}) {
  const queryClient = useQueryClient();
  const defaultChannelId =
    channels.find((channel) => channel.isDefault)?.id ?? channels[0]?.id ?? "";
  const [file, setFile] = React.useState<File | null>(null);
  const [fileInputKey, setFileInputKey] = React.useState(0);
  const [deviceType, setDeviceType] = React.useState("esp32");
  const [version, setVersion] = React.useState("");
  const [channelId, setChannelId] = React.useState("");
  const selectedChannelId = channelId || defaultChannelId;

  const mutation = useMutation({
    mutationFn: async () => {
      if (!file) {
        throw new Error("Select a firmware file");
      }
      return uploadFirmwareVersion({
        file,
        deviceType,
        version,
        channelId: selectedChannelId || null,
      });
    },
    onSuccess: async () => {
      setFile(null);
      setFileInputKey((value) => value + 1);
      setVersion("");
      await queryClient.invalidateQueries({
        queryKey: queryKeys.firmwareVersions,
      });
    },
  });

  return (
    <form
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        mutation.mutate();
      }}
    >
      {mutation.error ? (
        <p className="text-xs text-red-600 dark:text-red-300">
          {mutation.error.message}
        </p>
      ) : null}

      <div>
        <Label htmlFor="firmware-file">Artifact</Label>
        <Input
          accept=".bin,.img,.hex,.uf2,application/octet-stream"
          className="mt-2"
          id="firmware-file"
          key={fileInputKey}
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          type="file"
        />
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div>
          <Label htmlFor="firmware-device-type">Device type</Label>
          <Input
            className="mt-2"
            id="firmware-device-type"
            onChange={(event) => setDeviceType(event.target.value)}
            required
            value={deviceType}
          />
        </div>
        <div>
          <Label htmlFor="firmware-version">Version</Label>
          <Input
            className="mt-2"
            id="firmware-version"
            onChange={(event) => setVersion(event.target.value)}
            placeholder="1.0.0"
            required
            value={version}
          />
        </div>
        <div>
          <Label htmlFor="firmware-channel">Channel</Label>
          <select
            className={selectClass}
            id="firmware-channel"
            onChange={(event) => setChannelId(event.target.value)}
            value={selectedChannelId}
          >
            <option value="">Default</option>
            {channels.map((channel) => (
              <option key={channel.id} value={channel.id}>
                {channel.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <Button disabled={mutation.isPending} type="submit">
        <UploadCloud className="h-4 w-4" aria-hidden="true" />
        Upload firmware
      </Button>
    </form>
  );
}
