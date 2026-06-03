"use client";

import { Suspense } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, KeyRound, RefreshCcw } from "lucide-react";
import { useSearchParams } from "next/navigation";

import {
  DataNotice,
  DataPanel,
  EmptyState,
  formatDateTime,
  PageHeader,
  Row,
  RowList,
  StatusBadge,
} from "@/components/dashboard/ui";
import { Button } from "@/components/ui/button";
import {
  claimDeviceProvisioningEntry,
  previewDeviceProvisioningClaimEntry,
} from "@/lib/queries";

export default function ProvisioningClaimPage() {
  return (
    <Suspense fallback={<DataNotice state="loading" />}>
      <ProvisioningClaimView />
    </Suspense>
  );
}

function ProvisioningClaimView() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const preview = useQuery({
    queryKey: ["provisioning-claim-preview", token],
    queryFn: () => previewDeviceProvisioningClaimEntry(token),
    enabled: token.length > 0,
  });
  const claim = useMutation({
    mutationFn: () =>
      claimDeviceProvisioningEntry({
        token,
        claimMetadata: {
          source: "web-qr-claim",
          userAgent:
            typeof navigator !== "undefined" ? navigator.userAgent : null,
        },
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["provisioning-claim-preview", token],
      });
    },
  });

  const config = claim.data ?? preview.data ?? null;
  const canClaim = Boolean(token && preview.data?.status === "pending");

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Provisioning"
        title="Device Claim"
        description="QR-based provisioning confirmation for a pending device token."
      >
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            void queryClient.invalidateQueries({
              queryKey: ["provisioning-claim-preview", token],
            })
          }
          disabled={!token}
        >
          <RefreshCcw className="h-4 w-4" aria-hidden="true" />
          Refresh
        </Button>
      </PageHeader>

      {!token ? (
        <EmptyState
          title="Missing token"
          detail="Open this page from a GrowLab provisioning QR code."
        />
      ) : null}

      {preview.isLoading ? <DataNotice state="loading" /> : null}
      {preview.isError ? <DataNotice state="error" /> : null}
      {claim.error ? (
        <p className="text-xs text-red-600 dark:text-red-300">
          {claim.error.message}
        </p>
      ) : null}

      {config ? (
        <section className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
          <DataPanel
            title="Claim status"
            description="Provisioning token state."
          >
            <RowList>
              <Row
                title="Status"
                detail={config.id}
                meta={<StatusBadge value={config.status} />}
              />
              <Row
                title="Device"
                detail={config.deviceUid ?? config.deviceId ?? "not linked"}
                meta={<StatusBadge value={config.deviceType ?? "device"} />}
              />
              <Row
                title="Device name"
                detail={config.deviceName ?? "not set"}
              />
              <Row title="Expires" detail={formatDateTime(config.expiresAt)} />
              <Row title="Claimed" detail={formatDateTime(config.claimedAt)} />
              <Row title="Attempts" detail={`${config.claimAttempts ?? 0}`} />
            </RowList>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                disabled={!canClaim || claim.isPending}
                onClick={() => claim.mutate()}
              >
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                Claim device
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={!token}
                onClick={() => void navigator.clipboard.writeText(token)}
              >
                <KeyRound className="h-4 w-4" aria-hidden="true" />
                Copy token
              </Button>
            </div>
          </DataPanel>

          <DataPanel
            title="Provisioning config"
            description="Configuration returned after claim."
          >
            <textarea
              readOnly
              className="min-h-80 w-full rounded-md border border-border bg-muted/30 p-3 font-mono text-xs"
              value={JSON.stringify(config.provisioningConfig ?? {}, null, 2)}
            />
          </DataPanel>
        </section>
      ) : null}
    </div>
  );
}
