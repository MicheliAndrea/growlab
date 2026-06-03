"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Layers, PlusCircle, Save, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DataNotice, EmptyState } from "@/components/dashboard/ui";
import type { Zone } from "@/lib/api";
import { updateZone } from "@/lib/api";
import { queryKeys } from "@/lib/queries";
import { cn } from "@/lib/utils";

type ZonePlant = {
  id: string;
  name: string;
  code?: string | null;
  status?: string;
  currentHealthStatus?: string;
};

type DigitalTwinElementType =
  | "plant"
  | "sensor"
  | "device"
  | "light"
  | "fan"
  | "shelf"
  | "note";

type DigitalTwinElement = {
  id: string;
  type: DigitalTwinElementType;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  layer: number;
  color: string;
  plantId: string | null;
  note: string | null;
};

type DigitalTwin = {
  version: number;
  canvas: {
    width: number;
    height: number;
    unit: string;
  };
  elements: DigitalTwinElement[];
};

const elementTypes: DigitalTwinElementType[] = [
  "plant",
  "sensor",
  "device",
  "light",
  "fan",
  "shelf",
  "note",
];

const typeColors: Record<DigitalTwinElementType, string> = {
  plant: "#16a34a",
  sensor: "#0284c7",
  device: "#64748b",
  light: "#f59e0b",
  fan: "#7c3aed",
  shelf: "#92400e",
  note: "#e11d48",
};

export function ZoneDigitalTwinPreview({
  zone,
  plants,
}: {
  zone: Zone;
  plants: ZonePlant[];
}) {
  const twin = readDigitalTwin(zone, plants);

  if (!twin.elements.length) {
    return (
      <div className="rounded-md border border-dashed border-border px-4 py-8 text-center">
        <div className="text-sm font-medium">No digital twin elements</div>
        <div className="mt-1 text-sm text-muted-foreground">
          Add free-positioned elements in the editor below.
        </div>
      </div>
    );
  }

  return <DigitalTwinCanvas twin={twin} plants={plants} readOnly />;
}

export function ZoneDigitalTwinEditor({
  zone,
  plants,
}: {
  zone: Zone;
  plants: ZonePlant[];
}) {
  const queryClient = useQueryClient();
  const [twin, setTwin] = React.useState(() => readDigitalTwin(zone, plants));
  const [selectedId, setSelectedId] = React.useState<string | null>(
    twin.elements[0]?.id ?? null,
  );
  const [newType, setNewType] = React.useState<DigitalTwinElementType>("plant");
  const [newLabel, setNewLabel] = React.useState("");
  const [newPlantId, setNewPlantId] = React.useState("none");

  React.useEffect(() => {
    const nextTwin = readDigitalTwin(zone, plants);
    setTwin(nextTwin);
    setSelectedId(nextTwin.elements[0]?.id ?? null);
  }, [zone.id, zone.metadata, plants]);

  const selectedElement =
    twin.elements.find((element) => element.id === selectedId) ?? null;

  const mutation = useMutation({
    mutationFn: async () => {
      const metadata = {
        ...(zone.metadata ?? {}),
        digitalTwin: twin,
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
          `Digital twin save failed with status ${response.status}`,
        );
      }

      return response.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.zone(zone.id),
      });
    },
  });

  function addElement() {
    const plant = plants.find((item) => item.id === newPlantId) ?? null;
    const type = newType;
    const element: DigitalTwinElement = {
      id: `element-${Date.now()}`,
      type,
      label:
        newLabel.trim() ||
        plant?.name ||
        `${type[0]?.toUpperCase() ?? "E"}${type.slice(1)}`,
      x: 40,
      y: 40,
      width: type === "note" ? 26 : 16,
      height: type === "note" ? 14 : 16,
      rotation: 0,
      layer: twin.elements.length + 1,
      color: typeColors[type],
      plantId: plant?.id ?? null,
      note: null,
    };

    setTwin((current) => ({
      ...current,
      elements: [...current.elements, element],
    }));
    setSelectedId(element.id);
    setNewLabel("");
    setNewPlantId("none");
  }

  function updateSelected(patch: Partial<DigitalTwinElement>) {
    if (!selectedId) {
      return;
    }
    setTwin((current) => ({
      ...current,
      elements: current.elements.map((element) =>
        element.id === selectedId ? { ...element, ...patch } : element,
      ),
    }));
  }

  function deleteSelected() {
    if (!selectedId) {
      return;
    }
    setTwin((current) => ({
      ...current,
      elements: current.elements.filter((element) => element.id !== selectedId),
    }));
    setSelectedId(null);
  }

  function moveElement(id: string, x: number, y: number) {
    setTwin((current) => ({
      ...current,
      elements: current.elements.map((element) =>
        element.id === id
          ? {
              ...element,
              x: clampNumber(x, 0, 100 - element.width),
              y: clampNumber(y, 0, 100 - element.height),
            }
          : element,
      ),
    }));
  }

  return (
    <div className="grid gap-4">
      {mutation.error ? (
        <p className="text-xs text-red-600 dark:text-red-300">
          {mutation.error.message}
        </p>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[1.4fr_0.9fr]">
        <DigitalTwinCanvas
          twin={twin}
          plants={plants}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onMove={moveElement}
        />

        <div className="grid gap-3">
          <div className="rounded-md border border-border p-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <PlusCircle className="h-4 w-4 text-muted-foreground" />
              Add element
            </div>
            <div className="mt-3 grid gap-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <Label htmlFor="digital-twin-type">Type</Label>
                  <select
                    id="digital-twin-type"
                    className="mt-2 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={newType}
                    onChange={(event) =>
                      setNewType(event.target.value as DigitalTwinElementType)
                    }
                  >
                    {elementTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="digital-twin-plant">Plant</Label>
                  <select
                    id="digital-twin-plant"
                    className="mt-2 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={newPlantId}
                    onChange={(event) => setNewPlantId(event.target.value)}
                  >
                    <option value="none">No plant</option>
                    {plants.map((plant) => (
                      <option key={plant.id} value={plant.id}>
                        {plant.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <Label htmlFor="digital-twin-label">Label</Label>
                <Input
                  id="digital-twin-label"
                  className="mt-2"
                  value={newLabel}
                  onChange={(event) => setNewLabel(event.target.value)}
                  placeholder="Optional label"
                />
              </div>
              <Button type="button" variant="outline" onClick={addElement}>
                <PlusCircle className="h-4 w-4" aria-hidden="true" />
                Add to canvas
              </Button>
            </div>
          </div>

          <div className="rounded-md border border-border p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Layers className="h-4 w-4 text-muted-foreground" />
                Selected element
              </div>
              <Badge variant={selectedElement ? "success" : "secondary"}>
                {selectedElement ? selectedElement.type : "none"}
              </Badge>
            </div>
            {selectedElement ? (
              <div className="mt-3 grid gap-3">
                <div>
                  <Label htmlFor="digital-twin-selected-label">Label</Label>
                  <Input
                    id="digital-twin-selected-label"
                    className="mt-2"
                    value={selectedElement.label}
                    onChange={(event) =>
                      updateSelected({ label: event.target.value })
                    }
                  />
                </div>
                <div className="grid gap-2 sm:grid-cols-4">
                  <NumberField
                    label="X"
                    value={selectedElement.x}
                    onChange={(value) => updateSelected({ x: value })}
                  />
                  <NumberField
                    label="Y"
                    value={selectedElement.y}
                    onChange={(value) => updateSelected({ y: value })}
                  />
                  <NumberField
                    label="W"
                    value={selectedElement.width}
                    onChange={(value) => updateSelected({ width: value })}
                  />
                  <NumberField
                    label="H"
                    value={selectedElement.height}
                    onChange={(value) => updateSelected({ height: value })}
                  />
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                  <NumberField
                    label="Rotation"
                    value={selectedElement.rotation}
                    onChange={(value) => updateSelected({ rotation: value })}
                  />
                  <NumberField
                    label="Layer"
                    value={selectedElement.layer}
                    onChange={(value) => updateSelected({ layer: value })}
                  />
                  <div>
                    <Label htmlFor="digital-twin-color">Color</Label>
                    <Input
                      id="digital-twin-color"
                      className="mt-2"
                      type="color"
                      value={selectedElement.color}
                      onChange={(event) =>
                        updateSelected({ color: event.target.value })
                      }
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="digital-twin-note">Note</Label>
                  <Textarea
                    id="digital-twin-note"
                    className="mt-2 min-h-20"
                    value={selectedElement.note ?? ""}
                    onChange={(event) =>
                      updateSelected({ note: event.target.value || null })
                    }
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={deleteSelected}
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  Delete element
                </Button>
              </div>
            ) : (
              <EmptyState title="No element selected" />
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button disabled={mutation.isPending} onClick={() => mutation.mutate()}>
          <Save className="h-4 w-4" aria-hidden="true" />
          Save digital twin
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => setTwin(readDigitalTwin(zone, plants))}
        >
          Reset from zone
        </Button>
      </div>
    </div>
  );
}

function DigitalTwinCanvas({
  twin,
  plants,
  readOnly = false,
  selectedId,
  onSelect,
  onMove,
}: {
  twin: DigitalTwin;
  plants: ZonePlant[];
  readOnly?: boolean;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  onMove?: (id: string, x: number, y: number) => void;
}) {
  const sortedElements = [...twin.elements].sort(
    (first, second) => first.layer - second.layer,
  );

  return (
    <div
      className="relative aspect-[16/10] overflow-hidden rounded-md border border-border bg-[linear-gradient(to_right,hsl(var(--border))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border))_1px,transparent_1px)] bg-[size:8.333%_10%]"
      onDragOver={(event) => {
        if (!readOnly) {
          event.preventDefault();
        }
      }}
      onDrop={(event) => {
        if (readOnly || !onMove) {
          return;
        }
        event.preventDefault();
        const id = event.dataTransfer.getData("application/growlab-element");
        const bounds = event.currentTarget.getBoundingClientRect();
        const x = ((event.clientX - bounds.left) / bounds.width) * 100;
        const y = ((event.clientY - bounds.top) / bounds.height) * 100;
        if (id) {
          onMove(id, x, y);
        }
      }}
    >
      {sortedElements.map((element) => {
        const plant = element.plantId
          ? plants.find((item) => item.id === element.plantId)
          : null;

        return (
          <button
            key={element.id}
            type="button"
            draggable={!readOnly}
            onClick={() => onSelect?.(element.id)}
            onDragStart={(event) => {
              event.dataTransfer.setData(
                "application/growlab-element",
                element.id,
              );
            }}
            className={cn(
              "absolute grid min-h-8 min-w-12 place-items-center rounded-md border px-2 py-1 text-center text-xs font-medium text-white shadow-sm transition",
              selectedId === element.id
                ? "border-ring ring-2 ring-ring"
                : "border-black/10",
            )}
            style={{
              left: `${element.x}%`,
              top: `${element.y}%`,
              width: `${element.width}%`,
              height: `${element.height}%`,
              transform: `rotate(${element.rotation}deg)`,
              zIndex: element.layer,
              backgroundColor: element.color,
            }}
          >
            <span className="line-clamp-2">{plant?.name ?? element.label}</span>
          </button>
        );
      })}
      {!sortedElements.length ? <DataNotice state="loading" /> : null}
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <Input
        className="mt-2"
        type="number"
        value={value}
        onChange={(event) =>
          onChange(Number.parseFloat(event.target.value || "0"))
        }
      />
    </div>
  );
}

function readDigitalTwin(zone: Zone, plants: ZonePlant[]): DigitalTwin {
  const metadata = zone.metadata as Record<string, unknown> | null | undefined;
  const existing =
    metadata && typeof metadata === "object" && !Array.isArray(metadata)
      ? metadata.digitalTwin
      : null;

  if (existing && typeof existing === "object" && !Array.isArray(existing)) {
    return normalizeDigitalTwin(existing as Partial<DigitalTwin>, plants);
  }

  return normalizeDigitalTwin(
    {
      version: 1,
      canvas: { width: 120, height: 80, unit: "cm" },
      elements: plants.slice(0, 6).map((plant, index) => ({
        id: `plant-${plant.id}`,
        type: "plant",
        label: plant.name,
        x: 8 + (index % 3) * 28,
        y: 12 + Math.floor(index / 3) * 34,
        width: 18,
        height: 18,
        rotation: 0,
        layer: index + 1,
        color: typeColors.plant,
        plantId: plant.id,
        note: null,
      })),
    },
    plants,
  );
}

function normalizeDigitalTwin(
  input: Partial<DigitalTwin>,
  plants: ZonePlant[],
): DigitalTwin {
  const elements = Array.isArray(input.elements) ? input.elements : [];

  return {
    version: 1,
    canvas: {
      width: clampNumber(input.canvas?.width ?? 120, 10, 1000),
      height: clampNumber(input.canvas?.height ?? 80, 10, 1000),
      unit: input.canvas?.unit ?? "cm",
    },
    elements: elements.map((element, index) => {
      const type = elementTypes.includes(element.type) ? element.type : "note";
      const plant = element.plantId
        ? plants.find((item) => item.id === element.plantId)
        : null;

      return {
        id: element.id || `element-${index + 1}`,
        type,
        label: element.label || plant?.name || type,
        x: clampNumber(element.x, 0, 100),
        y: clampNumber(element.y, 0, 100),
        width: clampNumber(element.width, 5, 100),
        height: clampNumber(element.height, 5, 100),
        rotation: clampNumber(element.rotation, -360, 360),
        layer: clampNumber(element.layer, 1, 999),
        color: element.color || typeColors[type],
        plantId: element.plantId ?? null,
        note: element.note ?? null,
      };
    }),
  };
}

function clampNumber(value: unknown, min: number, max: number) {
  const parsed =
    typeof value === "number" && Number.isFinite(value) ? value : min;
  return Math.min(Math.max(parsed, min), max);
}
