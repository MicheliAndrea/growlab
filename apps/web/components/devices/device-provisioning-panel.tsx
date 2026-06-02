"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Search, ShieldX, TimerOff } from "lucide-react";
import QRCode from "qrcode";

import {
  DataNotice,
  EmptyState,
  formatDateTime,
  Row,
  RowList,
  StatusBadge,
} from "@/components/dashboard/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Device } from "@/lib/api";
import {
  claimDeviceProvisioningEntry,
  createDeviceProvisioningEntry,
  fetchDeviceProvisioning,
  queryKeys,
  updateDeviceProvisioningEntry,
} from "@/lib/queries";

const selectClass =
  "mt-2 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const defaultProvisioningConfig = JSON.stringify({ role: "sensor" }, null, 2);
const defaultMetadata = JSON.stringify({}, null, 2);

export function DeviceProvisioningPanel({ devices }: { devices: Device[] }) {
  const queryClient = useQueryClient();
  const [deviceIdInput, setDeviceIdInput] = React.useState("");
  const [activeDeviceId, setActiveDeviceId] = React.useState("");
  const [provisioningConfig, setProvisioningConfig] = React.useState(
    defaultProvisioningConfig,
  );
  const [metadata, setMetadata] = React.useState(defaultMetadata);
  const [expiresAt, setExpiresAt] = React.useState("");
  const [claimToken, setClaimToken] = React.useState("");
  const [generatedClaimUrl, setGeneratedClaimUrl] = React.useState("");
  const [qrSvg, setQrSvg] = React.useState("");
  const [formError, setFormError] = React.useState<string | null>(null);

  const provisioning = useQuery({
    queryKey: activeDeviceId
      ? queryKeys.deviceProvisioning(activeDeviceId)
      : ["device-provisioning", "none"],
    queryFn: () => fetchDeviceProvisioning(activeDeviceId),
    enabled: Boolean(activeDeviceId),
    refetchInterval: 30_000,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createDeviceProvisioningEntry(activeDeviceId, {
        provisioningConfig: parseOptionalJsonObject(
          provisioningConfig,
          "provisioning config",
        ),
        metadata: parseOptionalJsonObject(metadata, "metadata"),
        expiresAt: parseOptionalDateTime(expiresAt),
      }),
    onSuccess: async (result) => {
      setFormError(null);
      setClaimToken(result.claimToken ?? "");
      setGeneratedClaimUrl(result.claimUrl ?? "");
      await queryClient.invalidateQueries({
        queryKey: queryKeys.deviceProvisioning(activeDeviceId),
      });
    },
  });

  const claimMutation = useMutation({
    mutationFn: () =>
      claimDeviceProvisioningEntry({
        token: claimToken.trim(),
      }),
    onSuccess: async () => {
      setFormError(null);
      await queryClient.invalidateQueries({
        queryKey: queryKeys.deviceProvisioning(activeDeviceId),
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (input: {
      provisioningId: string;
      status: "expired" | "revoked";
    }) =>
      updateDeviceProvisioningEntry(activeDeviceId, input.provisioningId, {
        status: input.status,
        expiresAt:
          input.status === "expired" ? new Date().toISOString() : undefined,
        metadata: { source: "web-dashboard" },
      }),
    onSuccess: async () => {
      setFormError(null);
      setGeneratedClaimUrl("");
      setClaimToken("");
      await queryClient.invalidateQueries({
        queryKey: queryKeys.deviceProvisioning(activeDeviceId),
      });
    },
  });

  const activeDevice = devices.find((device) => device.id === activeDeviceId);
  const config = provisioning.data;
  const claimUrl = generatedClaimUrl || config?.claimUrl || "";

  React.useEffect(() => {
    let cancelled = false;
    if (!claimUrl) {
      setQrSvg("");
      return;
    }

    void QRCode.toString(claimUrl, {
      type: "svg",
      margin: 1,
      width: 256,
      errorCorrectionLevel: "M",
    })
      .then((svg) => {
        if (!cancelled) {
          setQrSvg(svg);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setQrSvg("");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [claimUrl]);

  function loadDevice() {
    const normalized = deviceIdInput.trim();
    if (!normalized) {
      return;
    }

    setActiveDeviceId(normalized);
    setGeneratedClaimUrl("");
    setClaimToken("");
  }

  function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeDeviceId) {
      return;
    }

    try {
      setFormError(null);
      createMutation.mutate();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Invalid payload");
    }
  }

  function handleClaim(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!claimToken.trim()) {
      setFormError("Claim token is required.");
      return;
    }

    setFormError(null);
    claimMutation.mutate();
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 md:grid-cols-[1fr_auto]">
        <div>
          <Label htmlFor="provisioning-device-id">Device ID</Label>
          <Input
            id="provisioning-device-id"
            placeholder="Paste a device UUID"
            value={deviceIdInput}
            onChange={(event) => setDeviceIdInput(event.target.value)}
            className="mt-2"
          />
        </div>
        <div className="flex items-end">
          <Button type="button" variant="outline" onClick={loadDevice}>
            <Search className="h-4 w-4" aria-hidden="true" />
            Load device
          </Button>
        </div>
      </div>

      <div>
        <Label htmlFor="provisioning-device-select">Known devices</Label>
        <select
          id="provisioning-device-select"
          className={selectClass}
          value={activeDeviceId}
          onChange={(event) => {
            setActiveDeviceId(event.target.value);
            setDeviceIdInput(event.target.value);
            setGeneratedClaimUrl("");
            setClaimToken("");
          }}
        >
          <option value="">Select device</option>
          {devices.map((device) => (
            <option key={device.id} value={device.id}>
              {device.name} ({device.deviceUid})
            </option>
          ))}
        </select>
      </div>

      {activeDevice ? (
        <RowList>
          <Row
            title={activeDevice.name}
            detail={activeDevice.deviceUid}
            meta={<StatusBadge value={activeDevice.status} />}
          />
        </RowList>
      ) : null}

      {!activeDeviceId ? (
        <EmptyState
          title="No device selected"
          detail="Pick a device to inspect and generate provisioning metadata."
        />
      ) : null}

      {formError ? (
        <p className="text-xs text-red-600 dark:text-red-300">{formError}</p>
      ) : null}
      {createMutation.error ? (
        <p className="text-xs text-red-600 dark:text-red-300">
          {createMutation.error.message}
        </p>
      ) : null}
      {claimMutation.error ? (
        <p className="text-xs text-red-600 dark:text-red-300">
          {claimMutation.error.message}
        </p>
      ) : null}
      {updateMutation.error ? (
        <p className="text-xs text-red-600 dark:text-red-300">
          {updateMutation.error.message}
        </p>
      ) : null}
      {provisioning.isLoading ? <DataNotice state="loading" /> : null}
      {provisioning.isError ? <DataNotice state="error" /> : null}

      {activeDeviceId ? (
        <form
          className="grid gap-4 rounded-md border border-border p-4"
          onSubmit={handleCreate}
        >
          <div className="text-sm font-medium">Generate provisioning</div>

          <div>
            <Label htmlFor="provisioning-config">Provisioning config</Label>
            <Textarea
              id="provisioning-config"
              value={provisioningConfig}
              onChange={(event) => setProvisioningConfig(event.target.value)}
              className="mt-2 min-h-40 font-mono text-xs"
            />
          </div>

          <div>
            <Label htmlFor="provisioning-metadata">Metadata</Label>
            <Textarea
              id="provisioning-metadata"
              value={metadata}
              onChange={(event) => setMetadata(event.target.value)}
              className="mt-2 min-h-28 font-mono text-xs"
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label htmlFor="provisioning-expires-at">Expires at</Label>
              <Input
                id="provisioning-expires-at"
                type="datetime-local"
                value={expiresAt}
                onChange={(event) => setExpiresAt(event.target.value)}
                className="mt-2"
              />
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={createMutation.isPending}>
                Generate provisioning
              </Button>
            </div>
          </div>
        </form>
      ) : null}

      {config ? (
        <div className="grid gap-4">
          <RowList>
            <Row
              title="Status"
              detail={formatDateTime(config.updatedAt)}
              meta={<StatusBadge value={config.status} />}
            >
              {config.status === "pending" ? (
                <div className="flex flex-wrap gap-2">
                  <Button
                    disabled={updateMutation.isPending}
                    onClick={() =>
                      updateMutation.mutate({
                        provisioningId: config.id,
                        status: "expired",
                      })
                    }
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    <TimerOff className="h-4 w-4" aria-hidden="true" />
                    Mark expired
                  </Button>
                  <Button
                    disabled={updateMutation.isPending}
                    onClick={() =>
                      updateMutation.mutate({
                        provisioningId: config.id,
                        status: "revoked",
                      })
                    }
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    <ShieldX className="h-4 w-4" aria-hidden="true" />
                    Revoke
                  </Button>
                </div>
              ) : null}
            </Row>
            <Row
              title="Expires at"
              detail={formatDateTime(config.expiresAt)}
              meta={<StatusBadge value="expiry" />}
            />
            <Row
              title="Claimed at"
              detail={formatDateTime(config.claimedAt)}
              meta={<StatusBadge value={config.deviceId ?? "open"} />}
            />
          </RowList>

          <div className="grid gap-3 rounded-md border border-border p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-medium">Claim payload</div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={async () => {
                  if (!claimUrl) {
                    return;
                  }
                  await navigator.clipboard.writeText(claimUrl);
                }}
                disabled={!claimUrl}
              >
                <Copy className="h-4 w-4" aria-hidden="true" />
                Copy URL
              </Button>
            </div>
            <Textarea
              readOnly
              className="min-h-28 font-mono text-xs"
              value={claimUrl || "claim url not available"}
            />
            <p className="text-xs text-muted-foreground">
              This URL is the QR payload. Feed it into any QR generator or
              mobile scanner flow.
            </p>
          </div>

          {qrSvg ? (
            <div className="grid gap-3 rounded-md border border-border p-4">
              <div className="text-sm font-medium">QR code</div>
              <div
                className="grid place-items-center rounded-md bg-background p-4"
                dangerouslySetInnerHTML={{ __html: qrSvg }}
              />
            </div>
          ) : null}

          <form
            className="grid gap-3 rounded-md border border-border p-4"
            onSubmit={handleClaim}
          >
            <div className="text-sm font-medium">Claim token</div>
            <div className="grid gap-3 md:grid-cols-[1fr_auto]">
              <Input
                value={claimToken}
                onChange={(event) => setClaimToken(event.target.value)}
                placeholder="Paste claim token"
              />
              <Button type="submit" disabled={claimMutation.isPending}>
                Mark claimed
              </Button>
            </div>
          </form>

          <div className="grid gap-3">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-medium">Provisioning config</div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={async () => {
                  await navigator.clipboard.writeText(
                    JSON.stringify(config.provisioningConfig, null, 2),
                  );
                }}
              >
                <Copy className="h-4 w-4" aria-hidden="true" />
                Copy JSON
              </Button>
            </div>
            <Textarea
              readOnly
              className="min-h-64 font-mono text-xs"
              value={JSON.stringify(config.provisioningConfig, null, 2)}
            />
          </div>

          <div className="grid gap-3">
            <div className="text-sm font-medium">Metadata</div>
            <Textarea
              readOnly
              className="min-h-40 font-mono text-xs"
              value={JSON.stringify(config.metadata ?? {}, null, 2)}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
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

function parseOptionalDateTime(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("expires at must be a valid date and time.");
  }

  return parsed.toISOString();
}
