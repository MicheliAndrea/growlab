"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PlusCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { PlantTaskCreateRequest } from "@/lib/api";
import { createPlantTaskEntry, queryKeys } from "@/lib/queries";

const defaultJson = JSON.stringify({}, null, 2);

export function PlantTaskForm({ plantId }: { plantId: string }) {
  const queryClient = useQueryClient();
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [dueAt, setDueAt] = React.useState("");
  const [recurrenceConfig, setRecurrenceConfig] = React.useState(defaultJson);
  const [metadata, setMetadata] = React.useState(defaultJson);
  const [formError, setFormError] = React.useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (request: PlantTaskCreateRequest) =>
      createPlantTaskEntry(plantId, request),
    onSuccess: async () => {
      setTitle("");
      setDescription("");
      setDueAt("");
      setRecurrenceConfig(defaultJson);
      setMetadata(defaultJson);
      setFormError(null);
      await queryClient.invalidateQueries({
        queryKey: queryKeys.plantTasks(plantId),
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.plantTimeline(plantId),
      });
    },
  });

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setFormError("Task title is required.");
      return;
    }

    try {
      const request: PlantTaskCreateRequest = {
        title: trimmedTitle,
        description: description.trim() ? description.trim() : undefined,
        dueAt: dueAt ? new Date(dueAt).toISOString() : undefined,
        recurrenceConfig: parseJsonObject(
          recurrenceConfig,
          "recurrence config",
        ),
        metadata: parseJsonObject(metadata, "metadata"),
      };

      setFormError(null);
      mutation.mutate(request);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Invalid payload");
    }
  }

  return (
    <form className="grid gap-4" onSubmit={handleSubmit}>
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
          <Label htmlFor="task-title">Title</Label>
          <Input
            id="task-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="mt-2"
            placeholder="Check moisture"
          />
        </div>
        <div>
          <Label htmlFor="task-due-at">Due at</Label>
          <Input
            id="task-due-at"
            type="datetime-local"
            value={dueAt}
            onChange={(event) => setDueAt(event.target.value)}
            className="mt-2"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="task-description">Description</Label>
        <Textarea
          id="task-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          className="mt-2 min-h-24"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div>
          <Label htmlFor="task-recurrence">Recurrence config</Label>
          <Textarea
            id="task-recurrence"
            value={recurrenceConfig}
            onChange={(event) => setRecurrenceConfig(event.target.value)}
            className="mt-2 min-h-32 font-mono text-xs"
          />
        </div>
        <div>
          <Label htmlFor="task-metadata">Metadata</Label>
          <Textarea
            id="task-metadata"
            value={metadata}
            onChange={(event) => setMetadata(event.target.value)}
            className="mt-2 min-h-32 font-mono text-xs"
          />
        </div>
      </div>

      <Button disabled={mutation.isPending} type="submit">
        <PlusCircle className="h-4 w-4" aria-hidden="true" />
        Add task
      </Button>
    </form>
  );
}

function parseJsonObject(value: string, label: string) {
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
