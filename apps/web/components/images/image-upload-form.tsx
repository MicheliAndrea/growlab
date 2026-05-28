"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { uploadPlantImage } from "@/lib/api";
import { queryKeys } from "@/lib/queries";

const inputClass =
  "mt-2 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function ImageUploadForm({ plantId }: { plantId: string }) {
  const queryClient = useQueryClient();
  const [file, setFile] = React.useState<File | null>(null);
  const [capturedAt, setCapturedAt] = React.useState("");
  const [growthStage, setGrowthStage] = React.useState("");
  const [tags, setTags] = React.useState("");

  const mutation = useMutation({
    mutationFn: async () => {
      if (!file) {
        throw new Error("Select an image file");
      }

      const response = await uploadPlantImage(plantId, {
        file,
        capturedAt: capturedAt ? new Date(capturedAt).toISOString() : null,
        growthStage: growthStage || null,
        tags: tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
      });

      if (response.status !== 201) {
        throw new Error(`Image upload failed with status ${response.status}`);
      }

      return response.data;
    },
    onSuccess: async () => {
      setFile(null);
      setCapturedAt("");
      setGrowthStage("");
      setTags("");
      await queryClient.invalidateQueries({
        queryKey: queryKeys.plantImages(plantId),
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.plantTimeline(plantId),
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
        <Label htmlFor="image-file">Image</Label>
        <Input
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          className="mt-2"
          id="image-file"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          type="file"
        />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <Label htmlFor="capturedAt">Captured at</Label>
          <Input
            className="mt-2"
            id="capturedAt"
            onChange={(event) => setCapturedAt(event.target.value)}
            type="datetime-local"
            value={capturedAt}
          />
        </div>
        <div>
          <Label htmlFor="growthStage">Growth stage</Label>
          <select
            className={inputClass}
            id="growthStage"
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
        <Label htmlFor="tags">Tags</Label>
        <Input
          className="mt-2"
          id="tags"
          onChange={(event) => setTags(event.target.value)}
          placeholder="leaf, weekly, canopy"
          value={tags}
        />
      </div>

      <Button disabled={mutation.isPending} type="submit">
        Upload image
      </Button>
    </form>
  );
}
