"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  GripVertical,
  PencilLine,
  RotateCcw,
  Save,
  Trash2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Zone } from "@/lib/api";
import { updateZone } from "@/lib/api";
import { queryKeys } from "@/lib/queries";

type ZonePlant = {
  id: string;
  name: string;
  code?: string | null;
};

type ZoneLayout = {
  version: number;
  rows: number;
  columns: number;
  slots: LayoutSlot[];
};

type LayoutSlot = {
  id: string;
  label: string;
  plantId: string | null;
  plantName: string | null;
  plantCode: string | null;
  note: string | null;
};

export function ZoneLayoutEditor({
  zone,
  plants,
}: {
  zone: Zone;
  plants: ZonePlant[];
}) {
  const queryClient = useQueryClient();
  const [layout, setLayout] = React.useState<ZoneLayout>(() =>
    buildInitialLayout(zone, plants),
  );
  const [draggedPlantId, setDraggedPlantId] = React.useState<string | null>(
    null,
  );
  const [formError, setFormError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setLayout(buildInitialLayout(zone, plants));
    setDraggedPlantId(null);
  }, [zone.id, zone.metadata, plants]);

  const mutation = useMutation({
    mutationFn: async () => {
      const metadata = {
        ...(zone.metadata ?? {}),
        layout,
      };
      const response = await updateZone(zone.id, {
        growAreaId: zone.growAreaId,
        name: zone.name,
        slug: zone.slug,
        description: zone.description,
        environmentType: zone.environmentType,
        metadata,
      });

      if (response.status !== 200) {
        throw new Error(
          `Zone layout save failed with status ${response.status}`,
        );
      }

      return response.data;
    },
    onSuccess: async () => {
      setFormError(null);
      await queryClient.invalidateQueries({
        queryKey: queryKeys.zone(zone.id),
      });
    },
  });

  const unassignedPlants = plants.filter(
    (plant) => !layout.slots.some((slot) => slot.plantId === plant.id),
  );

  function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    mutation.mutate();
  }

  function handleDrop(slotIndex: number, plantId: string) {
    setLayout((current) =>
      assignPlantToSlot(current, slotIndex, plantId, plants),
    );
  }

  function handleDragStart(plantId: string) {
    setDraggedPlantId(plantId);
  }

  function handleClear(slotIndex: number) {
    setLayout((current) => {
      const next = cloneLayout(current);
      const slot = next.slots[slotIndex];
      if (!slot) {
        return current;
      }

      slot.plantId = null;
      slot.plantName = null;
      slot.plantCode = null;
      slot.note = null;
      return next;
    });
  }

  function handleReset() {
    setLayout(buildInitialLayout(zone, plants));
    setDraggedPlantId(null);
  }

  function handleRowsChange(value: number) {
    setLayout((current) => resizeLayout(current, value, current.columns));
  }

  function handleColumnsChange(value: number) {
    setLayout((current) => resizeLayout(current, current.rows, value));
  }

  return (
    <form className="grid gap-4" onSubmit={handleSave}>
      <div className="flex items-center gap-2 text-sm font-medium">
        <PencilLine
          className="h-4 w-4 text-muted-foreground"
          aria-hidden="true"
        />
        Persisted layout
      </div>
      <p className="text-xs text-muted-foreground">
        The layout is stored in `zone.metadata.layout` and reused by the zone
        preview.
      </p>

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
          <div className="text-xs uppercase tracking-normal text-muted-foreground">
            Rows
          </div>
          <Input
            type="number"
            min={1}
            max={6}
            value={layout.rows}
            onChange={(event) =>
              handleRowsChange(Number.parseInt(event.target.value || "1", 10))
            }
            className="mt-2"
          />
        </div>
        <div>
          <div className="text-xs uppercase tracking-normal text-muted-foreground">
            Columns
          </div>
          <Input
            type="number"
            min={1}
            max={6}
            value={layout.columns}
            onChange={(event) =>
              handleColumnsChange(
                Number.parseInt(event.target.value || "1", 10),
              )
            }
            className="mt-2"
          />
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_0.9fr]">
        <div className="grid gap-3">
          <div
            className="grid gap-2"
            style={{
              gridTemplateColumns: `repeat(${layout.columns}, minmax(0, 1fr))`,
            }}
          >
            {layout.slots.map((slot, index) => (
              <div
                key={slot.id}
                className={cn(
                  "min-h-28 rounded-md border p-3 transition-colors",
                  draggedPlantId
                    ? "border-dashed border-border"
                    : "border-border",
                )}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  const plantId = event.dataTransfer.getData("text/plain");
                  if (plantId) {
                    handleDrop(index, plantId);
                  }
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs uppercase tracking-normal text-muted-foreground">
                    {slot.label}
                  </div>
                  <div className="flex items-center gap-1">
                    {slot.plantId ? (
                      <Badge variant="secondary">occupied</Badge>
                    ) : (
                      <Badge variant="outline">empty</Badge>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleClear(index)}
                      disabled={!slot.plantId}
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </Button>
                  </div>
                </div>

                <div className="mt-3 min-h-14">
                  {slot.plantId ? (
                    <div
                      className="grid gap-1 rounded-md bg-muted/40 px-3 py-2"
                      draggable
                      onDragStart={() => handleDragStart(slot.plantId ?? "")}
                      onDragEnd={() => setDraggedPlantId(null)}
                    >
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <GripVertical
                          className="h-4 w-4 text-muted-foreground"
                          aria-hidden="true"
                        />
                        <span className="truncate">
                          {slot.plantName ?? "Assigned plant"}
                        </span>
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        {slot.plantCode ?? slot.plantId}
                      </div>
                    </div>
                  ) : (
                    <div className="grid min-h-14 place-items-center rounded-md border border-dashed border-border text-xs text-muted-foreground">
                      Drop a plant here
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-md border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
            Drag plants from the sidebar into slots. The layout is persisted in
            `zone.metadata.layout` and reused by the preview.
          </div>
        </div>

        <div className="grid gap-3">
          <div className="rounded-md border border-border p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-medium">Unassigned plants</div>
              <Badge
                variant={unassignedPlants.length > 0 ? "warning" : "success"}
              >
                {unassignedPlants.length}
              </Badge>
            </div>
            <div className="mt-3 grid gap-2">
              {unassignedPlants.length > 0 ? (
                unassignedPlants.map((plant) => (
                  <button
                    key={plant.id}
                    type="button"
                    draggable
                    onDragStart={() => handleDragStart(plant.id)}
                    onDragEnd={() => setDraggedPlantId(null)}
                    className="grid w-full gap-1 rounded-md border border-border bg-card px-3 py-2 text-left text-sm shadow-sm"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-medium">{plant.name}</span>
                      <Badge variant="outline">drag</Badge>
                    </div>
                    <span className="truncate text-xs text-muted-foreground">
                      {plant.code ?? plant.id}
                    </span>
                  </button>
                ))
              ) : (
                <div className="text-sm text-muted-foreground">
                  All plants are assigned to layout slots.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-md border border-border p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-medium">Layout summary</div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleReset}
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                Reset
              </Button>
            </div>
            <div className="mt-3 grid gap-2 text-sm text-muted-foreground">
              <div>Slots: {layout.slots.length}</div>
              <div>Rows: {layout.rows}</div>
              <div>Columns: {layout.columns}</div>
              <div>Dragging: {draggedPlantId ?? "none"}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={mutation.isPending}>
          <Save className="h-4 w-4" aria-hidden="true" />
          Save layout
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => setLayout(buildInitialLayout(zone, plants))}
        >
          Reset from zone
        </Button>
      </div>
    </form>
  );
}

function buildInitialLayout(zone: Zone, plants: ZonePlant[]): ZoneLayout {
  const existing = readExistingLayout(zone);
  if (existing) {
    return normalizeLayout(existing, plants);
  }

  return normalizeLayout(
    {
      version: 1,
      rows: 2,
      columns: 3,
      slots: [],
    },
    plants,
  );
}

function readExistingLayout(zone: Zone): ZoneLayout | null {
  if (!zone.metadata || typeof zone.metadata !== "object") {
    return null;
  }

  const layout = (zone.metadata as Record<string, unknown>).layout;
  if (!layout || typeof layout !== "object" || Array.isArray(layout)) {
    return null;
  }

  return layout as ZoneLayout;
}

function normalizeLayout(layout: ZoneLayout, plants: ZonePlant[]): ZoneLayout {
  const rows = clampInteger(layout.rows, 1, 6, 2);
  const columns = clampInteger(layout.columns, 1, 6, 3);
  const slotCount = Math.max(rows * columns, 1);
  const slots = layout.slots?.length
    ? layout.slots.slice(0, slotCount).map((slot, index) => ({
        id: slot.id ?? `slot-${index + 1}`,
        label: slot.label ?? `Slot ${String(index + 1).padStart(2, "0")}`,
        plantId: slot.plantId ?? null,
        plantName: slot.plantName ?? null,
        plantCode: slot.plantCode ?? null,
        note: slot.note ?? null,
      }))
    : [];

  while (slots.length < slotCount) {
    const index = slots.length + 1;
    slots.push({
      id: `slot-${index}`,
      label: `Slot ${String(index).padStart(2, "0")}`,
      plantId: null,
      plantName: null,
      plantCode: null,
      note: null,
    });
  }

  const assignedIds = new Set(
    slots
      .map((slot) => slot.plantId)
      .filter((value): value is string => Boolean(value)),
  );

  for (const plant of plants) {
    if (assignedIds.has(plant.id)) {
      continue;
    }
    if (slots.length >= slotCount) {
      break;
    }
    slots.push({
      id: `slot-${slots.length + 1}`,
      label: `Slot ${String(slots.length + 1).padStart(2, "0")}`,
      plantId: plant.id,
      plantName: plant.name,
      plantCode: plant.code ?? null,
      note: null,
    });
  }

  return {
    version: layout.version ?? 1,
    rows,
    columns,
    slots,
  };
}

function resizeLayout(layout: ZoneLayout, rows: number, columns: number) {
  const nextRows = clampInteger(rows, 1, 6, layout.rows);
  const nextColumns = clampInteger(columns, 1, 6, layout.columns);
  const slotCount = Math.max(nextRows * nextColumns, 1);
  const slots = layout.slots.slice(0, slotCount).map((slot, index) => ({
    ...slot,
    id: slot.id ?? `slot-${index + 1}`,
    label: slot.label ?? `Slot ${String(index + 1).padStart(2, "0")}`,
  }));

  while (slots.length < slotCount) {
    const index = slots.length + 1;
    slots.push({
      id: `slot-${index}`,
      label: `Slot ${String(index).padStart(2, "0")}`,
      plantId: null,
      plantName: null,
      plantCode: null,
      note: null,
    });
  }

  return {
    ...layout,
    rows: nextRows,
    columns: nextColumns,
    slots,
  };
}

function assignPlantToSlot(
  layout: ZoneLayout,
  slotIndex: number,
  plantId: string,
  plants: ZonePlant[],
) {
  const next = cloneLayout(layout);
  const sourceIndex = next.slots.findIndex((slot) => slot.plantId === plantId);
  const target = next.slots[slotIndex];
  const plant = plants.find((item) => item.id === plantId);
  if (!target || !plant) {
    return layout;
  }

  if (sourceIndex >= 0 && sourceIndex !== slotIndex) {
    const source = next.slots[sourceIndex];
    const displacedPlantId = target.plantId;
    const displacedPlant = displacedPlantId
      ? plants.find((item) => item.id === displacedPlantId)
      : null;

    source.plantId = displacedPlantId;
    source.plantName = displacedPlant?.name ?? null;
    source.plantCode = displacedPlant?.code ?? null;
    source.note = displacedPlantId ? `Moved from ${target.label}` : null;
  }

  target.plantId = plant.id;
  target.plantName = plant.name;
  target.plantCode = plant.code ?? null;
  target.note = null;

  return next;
}

function cloneLayout(layout: ZoneLayout): ZoneLayout {
  return {
    ...layout,
    slots: layout.slots.map((slot) => ({ ...slot })),
  };
}

function clampInteger(
  value: number,
  min: number,
  max: number,
  fallback: number,
) {
  if (!Number.isFinite(value)) {
    return fallback;
  }
  const rounded = Math.trunc(value);
  return Math.min(max, Math.max(min, rounded));
}
