"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Lightbulb, Power, PowerOff } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  DataNotice,
  EmptyState,
  formatDateTime,
  Row,
  RowList,
  StatusBadge,
} from "@/components/dashboard/ui";
import {
  setLightingBrightness,
  turnLightingOff,
  turnLightingOn,
  type LightingSystem,
} from "@/lib/api";
import {
  fetchLightingEvents,
  fetchLightingState,
  queryKeys,
} from "@/lib/queries";

const statePoll = 10_000;

export function LightingControlCard({ system }: { system: LightingSystem }) {
  const queryClient = useQueryClient();
  const [draftBrightness, setDraftBrightness] = React.useState<number | null>(
    null,
  );
  const state = useQuery({
    queryKey: queryKeys.lightingState(system.id),
    queryFn: () => fetchLightingState(system.id),
    refetchInterval: statePoll,
    retry: 1,
  });
  const events = useQuery({
    queryKey: queryKeys.lightingEvents(system.id),
    queryFn: () => fetchLightingEvents(system.id),
    refetchInterval: 15_000,
  });

  const brightness = draftBrightness ?? state.data?.brightnessPercent ?? 50;

  const invalidate = async () => {
    setDraftBrightness(null);
    await queryClient.invalidateQueries({
      queryKey: queryKeys.lightingState(system.id),
    });
    await queryClient.invalidateQueries({
      queryKey: queryKeys.lightingEvents(system.id),
    });
  };

  const onMutation = useMutation({
    mutationFn: () => turnLightingOn(system.id),
    onSuccess: invalidate,
  });
  const offMutation = useMutation({
    mutationFn: () => turnLightingOff(system.id),
    onSuccess: invalidate,
  });
  const brightnessMutation = useMutation({
    mutationFn: (value: number) =>
      setLightingBrightness(system.id, { brightnessPercent: value }),
    onSuccess: invalidate,
  });
  const pending =
    onMutation.isPending ||
    offMutation.isPending ||
    brightnessMutation.isPending;

  return (
    <article className="grid gap-4 rounded-lg border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-muted-foreground" />
            <h3 className="truncate text-sm font-semibold">{system.name}</h3>
          </div>
          <div className="mt-1 truncate text-xs text-muted-foreground">
            {system.endpointUrl ?? "endpoint not configured"}
          </div>
        </div>
        <StatusBadge
          value={
            state.data
              ? state.data.isOn
                ? "online"
                : "offline"
              : system.provider
          }
        />
      </div>

      {state.isLoading ? <DataNotice state="loading" /> : null}
      {state.isError ? <DataNotice state="error" /> : null}

      <div className="grid gap-3 rounded-md bg-muted p-3">
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="text-muted-foreground">Brightness</span>
          <span className="font-medium">
            {state.data?.brightnessPercent ?? brightness}%
          </span>
        </div>
        <input
          aria-label={`${system.name} brightness`}
          className="h-2 w-full accent-primary"
          disabled={pending}
          max={100}
          min={0}
          onChange={(event) => setDraftBrightness(Number(event.target.value))}
          type="range"
          value={brightness}
        />
        <div className="flex flex-wrap gap-2">
          <Button
            disabled={pending}
            onClick={() => onMutation.mutate()}
            size="sm"
            type="button"
          >
            <Power className="h-4 w-4" aria-hidden="true" />
            On
          </Button>
          <Button
            disabled={pending}
            onClick={() => offMutation.mutate()}
            size="sm"
            type="button"
            variant="outline"
          >
            <PowerOff className="h-4 w-4" aria-hidden="true" />
            Off
          </Button>
          <Button
            disabled={pending}
            onClick={() => brightnessMutation.mutate(brightness)}
            size="sm"
            type="button"
            variant="secondary"
          >
            Set {brightness}%
          </Button>
        </div>
      </div>

      <div className="grid gap-2">
        <div className="text-xs font-medium uppercase tracking-normal text-muted-foreground">
          Event history
        </div>
        {events.isError ? <DataNotice state="error" /> : null}
        {events.data && events.data.length > 0 ? (
          <RowList>
            {events.data.slice(0, 5).map((event) => (
              <Row
                key={event.id}
                title={event.eventType}
                detail={formatDateTime(event.occurredAt)}
                meta={<StatusBadge value={event.source} />}
              >
                {event.brightnessPercent !== null &&
                event.brightnessPercent !== undefined ? (
                  <span className="text-xs text-muted-foreground">
                    {event.brightnessPercent}%
                  </span>
                ) : null}
              </Row>
            ))}
          </RowList>
        ) : !events.isLoading && !events.isError ? (
          <EmptyState title="No lighting events" />
        ) : null}
      </div>
    </article>
  );
}
