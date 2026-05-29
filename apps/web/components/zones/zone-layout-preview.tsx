"use client";

import { Map, Sprout, Target } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type ZonePlant = {
  id: string;
  name: string;
  code?: string | null;
  status: string;
  currentHealthStatus: string;
};

type ZoneProfileSummary = {
  id: string;
  name: string;
  isActive: boolean;
  targetConfig: Record<string, unknown>;
};

type ZoneLayout = {
  version?: number;
  rows?: number;
  columns?: number;
  slots?: Array<{
    id?: string;
    label?: string;
    plantId?: string | null;
    plantName?: string | null;
    plantCode?: string | null;
    note?: string | null;
  }>;
};

type LayoutSlot = {
  plant: ZonePlant | null;
  label?: string;
  note?: string | null;
};

type MappedLayout = {
  rows: number;
  columns: number;
  slots: LayoutSlot[];
};

export function ZoneLayoutPreview({
  zoneName,
  plants,
  profiles,
  layout,
}: {
  zoneName: string;
  plants: ZonePlant[];
  profiles: ZoneProfileSummary[];
  layout?: ZoneLayout | null;
}) {
  const activeProfile = profiles.find((profile) => profile.isActive) ?? null;
  const mappedLayout = buildLayout(plants, layout);
  const targetSummary = summarizeTargetConfig(activeProfile?.targetConfig);
  const occupiedSlots = mappedLayout.slots.filter((slot) => slot.plant).length;
  const emptySlots = mappedLayout.slots.length - occupiedSlots;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Map className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          Zone layout preview
        </CardTitle>
        <CardDescription>
          Read-only digital twin sketch for {zoneName}. It combines the current
          plant set with the active target profile.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 xl:grid-cols-[1.4fr_0.9fr]">
        <div className="grid gap-3">
          <div
            className="grid gap-2"
            style={{
              gridTemplateColumns: `repeat(${mappedLayout.columns}, minmax(0, 1fr))`,
            }}
          >
            {mappedLayout.slots.map((slot, index) => (
              <div
                key={`${slot.label ?? slot.plant?.id ?? "empty"}-${index}`}
                className={cn(
                  "min-h-24 rounded-md border p-3",
                  slot.plant
                    ? "border-border bg-card"
                    : "border-dashed border-border bg-muted/40",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs uppercase tracking-normal text-muted-foreground">
                    {slot.label ?? `Slot ${String(index + 1).padStart(2, "0")}`}
                  </div>
                  {slot.plant ? (
                    <Badge
                      variant={healthVariant(slot.plant.currentHealthStatus)}
                    >
                      {slot.plant.currentHealthStatus}
                    </Badge>
                  ) : (
                    <Badge variant="secondary">empty</Badge>
                  )}
                </div>
                <div className="mt-3 min-w-0">
                  {slot.plant ? (
                    <>
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Sprout
                          className="h-4 w-4 text-muted-foreground"
                          aria-hidden="true"
                        />
                        <span className="truncate">{slot.plant.name}</span>
                      </div>
                      <div className="mt-1 truncate text-xs text-muted-foreground">
                        {slot.plant.code ?? slot.plant.status}
                      </div>
                    </>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      Unassigned position
                    </div>
                  )}
                  {slot.note ? (
                    <div className="mt-2 text-xs text-muted-foreground">
                      {slot.note}
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-md border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
            The preview now respects persisted rows and columns. Physical
            coordinates are still not stored, so slot placement is logical
            rather than spatially calibrated.
          </div>
        </div>

        <div className="grid gap-3">
          <div className="rounded-md border border-border p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-medium">Active profile</div>
              <Badge variant={activeProfile ? "success" : "secondary"}>
                {activeProfile ? "selected" : "none"}
              </Badge>
            </div>
            {activeProfile ? (
              <div className="mt-2 grid gap-1 text-sm">
                <div className="font-medium">{activeProfile.name}</div>
                <div className="text-xs text-muted-foreground">
                  {activeProfile.isActive ? "Enabled" : "Disabled"} target set
                </div>
              </div>
            ) : (
              <div className="mt-2 text-sm text-muted-foreground">
                No active target profile available.
              </div>
            )}
          </div>

          <div className="rounded-md border border-border p-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Target
                className="h-4 w-4 text-muted-foreground"
                aria-hidden="true"
              />
              Target summary
            </div>
            <div className="mt-3 grid gap-2">
              {targetSummary.length > 0 ? (
                targetSummary.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between gap-3 rounded-md bg-muted/40 px-3 py-2 text-xs"
                  >
                    <span className="font-medium capitalize">{item.label}</span>
                    <span className="truncate text-muted-foreground">
                      {item.value}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-sm text-muted-foreground">
                  No readable target fields found in the active profile JSON.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-md border border-border p-3">
            <div className="text-sm font-medium">Layout notes</div>
            <div className="mt-2 text-sm text-muted-foreground">
              This is a presentation layer backed by zone metadata. It gives
              operators a quick visual sense of occupancy and active targets
              without storing a separate geometry table.
            </div>
          </div>

          <div className="rounded-md border border-border p-3">
            <div className="text-sm font-medium">Layout stats</div>
            <div className="mt-2 grid gap-2 text-sm text-muted-foreground">
              <div>Version: {layout?.version ?? 1}</div>
              <div>Rows: {mappedLayout.rows}</div>
              <div>Columns: {mappedLayout.columns}</div>
              <div>Occupied: {occupiedSlots}</div>
              <div>Empty: {emptySlots}</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function buildLayout(plants: ZonePlant[], layout?: ZoneLayout | null) {
  const rows = layout?.rows ?? 2;
  const columns = layout?.columns ?? 3;
  const slotCount = Math.max(rows * columns, 1);
  const configuredSlots = layout?.slots?.length ? layout.slots : null;
  const slots: LayoutSlot[] = configuredSlots
    ? configuredSlots.slice(0, slotCount).map((slot) => ({
        plant:
          slot.plantId != null
            ? (plants.find((plant) => plant.id === slot.plantId) ?? null)
            : null,
        label: slot.label,
        note: slot.note,
      }))
    : plants.map((plant) => ({ plant }));

  while (slots.length < slotCount) {
    slots.push({ plant: null });
  }

  return {
    rows,
    columns,
    slots,
  } satisfies MappedLayout;
}

function summarizeTargetConfig(targetConfig?: Record<string, unknown> | null) {
  if (!targetConfig) {
    return [];
  }

  const items: Array<{ label: string; value: string }> = [];
  const entries = Object.entries(targetConfig);

  for (const [key, value] of entries.slice(0, 8)) {
    items.push({
      label: key,
      value: formatTargetValue(value),
    });
  }

  return items;
}

function formatTargetValue(value: unknown) {
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

function healthVariant(value?: string | null) {
  switch (value) {
    case "healthy":
    case "ok":
      return "success";
    case "stressed":
    case "watch":
      return "warning";
    case "critical":
    case "dead":
    case "failed":
      return "destructive";
    default:
      return "secondary";
  }
}
