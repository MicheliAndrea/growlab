"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createPlantEvent, type PlantEventCreateRequest } from "@/lib/api";
import { type PlantEventFormValues, plantEventFormSchema } from "@/lib/forms";
import { queryKeys } from "@/lib/queries";

const eventTypes = [
  "observation",
  "watering",
  "feeding",
  "pruning",
  "repotting",
  "treatment",
  "note",
];

export function PlantEventForm({ plantId }: { plantId: string }) {
  const queryClient = useQueryClient();
  const form = useForm<PlantEventFormValues>({
    resolver: zodResolver(plantEventFormSchema),
    defaultValues: {
      eventType: "observation",
      occurredAt: "",
      notes: "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: PlantEventFormValues) => {
      const payload: PlantEventCreateRequest = {
        eventType: values.eventType,
        occurredAt: values.occurredAt
          ? new Date(values.occurredAt).toISOString()
          : null,
        notes: values.notes || null,
      };
      const response = await createPlantEvent(plantId, payload);

      if (response.status !== 201) {
        throw new Error(`Plant event failed with status ${response.status}`);
      }

      return response.data;
    },
    onSuccess: async () => {
      form.reset({ eventType: "observation", occurredAt: "", notes: "" });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.plantEvents(plantId),
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.plantTimeline(plantId),
      });
    },
  });

  return (
    <form
      className="grid gap-3"
      onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
    >
      {mutation.error ? (
        <p className="text-xs text-red-600 dark:text-red-300">
          {mutation.error.message}
        </p>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <Label htmlFor="eventType">Type</Label>
          <select
            id="eventType"
            {...form.register("eventType")}
            className="mt-2 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {eventTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="occurredAt">Occurred at</Label>
          <Input
            id="occurredAt"
            type="datetime-local"
            {...form.register("occurredAt")}
            className="mt-2"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" {...form.register("notes")} className="mt-2" />
      </div>

      <Button disabled={mutation.isPending} type="submit">
        Add event
      </Button>
    </form>
  );
}
