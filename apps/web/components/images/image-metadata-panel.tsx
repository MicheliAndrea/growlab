"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { PlantImage } from "@/lib/api";
import { queryKeys, updatePlantImageMetadataEntry } from "@/lib/queries";

const selectClass =
  "mt-2 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

type EditableImage = PlantImage & {
  plantName?: string;
};

export function ImageMetadataPanel({ images }: { images: EditableImage[] }) {
  const queryClient = useQueryClient();
  const [selectedImageId, setSelectedImageId] = React.useState("");
  const selectedImage =
    images.find((image) => image.id === selectedImageId) ?? images[0];
  const [growthStage, setGrowthStage] = React.useState("");
  const [tags, setTags] = React.useState("");
  const [growthTracking, setGrowthTracking] = React.useState("{}");
  const [formError, setFormError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!selectedImage) {
      return;
    }
    setSelectedImageId(selectedImage.id);
    setGrowthStage(selectedImage.growthStage ?? "");
    setTags((selectedImage.tags ?? []).join(", "));
    setGrowthTracking(
      JSON.stringify(selectedImage.growthTracking ?? {}, null, 2),
    );
  }, [selectedImage?.id]);

  const mutation = useMutation({
    mutationFn: () => {
      if (!selectedImage) {
        throw new Error("Select an image before saving metadata.");
      }
      return updatePlantImageMetadataEntry(selectedImage.id, {
        growthStage: growthStage || null,
        growthTracking: parseJsonObject(growthTracking, "growth tracking"),
        tags: tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
        metadata: { source: "web-dashboard" },
      });
    },
    onSuccess: async (image) => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.plantImages(image.plantId),
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.plantTimeline(image.plantId),
      });
      setFormError(null);
    },
  });

  if (images.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
        Upload an image before editing growth metadata.
      </div>
    );
  }

  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        try {
          mutation.mutate();
        } catch (error) {
          setFormError(
            error instanceof Error ? error.message : "Invalid metadata",
          );
        }
      }}
    >
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
          <Label htmlFor="image-metadata-image">Image</Label>
          <select
            id="image-metadata-image"
            className={selectClass}
            onChange={(event) => setSelectedImageId(event.target.value)}
            value={selectedImage?.id ?? ""}
          >
            {images.map((image) => (
              <option key={image.id} value={image.id}>
                {image.plantName ?? image.originalFilename ?? image.id}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="image-metadata-stage">Growth stage</Label>
          <select
            id="image-metadata-stage"
            className={selectClass}
            onChange={(event) => setGrowthStage(event.target.value)}
            value={growthStage}
          >
            <option value="">Unset</option>
            <option value="seedling">Seedling</option>
            <option value="vegetative">Vegetative</option>
            <option value="flowering">Flowering</option>
            <option value="fruiting">Fruiting</option>
            <option value="dormant">Dormant</option>
          </select>
        </div>
      </div>

      <div>
        <Label htmlFor="image-metadata-tags">Tags</Label>
        <Input
          id="image-metadata-tags"
          className="mt-2"
          onChange={(event) => setTags(event.target.value)}
          placeholder="leaf, weekly, canopy"
          value={tags}
        />
      </div>

      <div>
        <Label htmlFor="image-metadata-growth">Growth tracking JSON</Label>
        <Textarea
          id="image-metadata-growth"
          className="mt-2 min-h-28 font-mono text-xs"
          onChange={(event) => setGrowthTracking(event.target.value)}
          value={growthTracking}
        />
      </div>

      <Button disabled={mutation.isPending} type="submit">
        <Save className="h-4 w-4" aria-hidden="true" />
        Save metadata
      </Button>
    </form>
  );
}

function parseJsonObject(value: string, label: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return {};
  }

  const parsed = JSON.parse(trimmed) as unknown;
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`${label} must be a JSON object.`);
  }

  return parsed as Record<string, unknown>;
}
