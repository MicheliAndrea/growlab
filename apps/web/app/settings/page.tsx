"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Database, Droplets, Moon, RefreshCcw, ServerCog } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DataNotice,
  DataPanel,
  MetricCard,
  PageHeader,
  Row,
  RowList,
  StatusBadge,
} from "@/components/dashboard/ui";
import { apiBaseUrl } from "@/lib/api";
import { fetchHealth, queryKeys } from "@/lib/queries";

const poll = 30_000;

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const health = useQuery({
    queryKey: queryKeys.health,
    queryFn: fetchHealth,
    refetchInterval: poll,
  });

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Settings"
        title="Runtime Settings"
        description="MVP runtime flags and local service endpoints."
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

      <section className="grid gap-3 md:grid-cols-3">
        <MetricCard
          title="API"
          value={health.data?.status ?? "unknown"}
          detail={apiBaseUrl}
          icon={ServerCog}
          tone={health.data?.status === "ok" ? "success" : "warning"}
        />
        <MetricCard
          title="Database"
          value="pg-01"
          detail="External TimescaleDB"
          icon={Database}
        />
        <MetricCard
          title="Irrigation"
          value="Disabled"
          detail="Manual run remains blocked"
          icon={Droplets}
          tone="warning"
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <DataPanel title="Runtime" description="Local application state.">
          <RowList>
            <Row
              title="API base URL"
              detail={apiBaseUrl}
              meta={<StatusBadge value={health.data?.status ?? "unknown"} />}
            />
            <Row
              title="Polling"
              detail="30 seconds, 15 seconds for active alerts"
              meta={<StatusBadge value="active" />}
            />
            <Row
              title="Authentication"
              detail="MVP mode"
              meta={<StatusBadge value="disabled" />}
            />
          </RowList>
        </DataPanel>

        <DataPanel title="Interface" description="Dashboard preferences.">
          <RowList>
            <Row
              title="Theme"
              detail="System color scheme"
              meta={<Moon className="h-4 w-4 text-muted-foreground" />}
            />
            <Row
              title="Alert surface"
              detail="Web dashboard"
              meta={<StatusBadge value="active" />}
            />
            <Row
              title="AI modules"
              detail="Not enabled in MVP"
              meta={<StatusBadge value="disabled" />}
            />
          </RowList>
        </DataPanel>
      </section>
    </div>
  );
}
