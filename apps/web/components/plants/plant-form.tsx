"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createPlant,
  updatePlant,
  type Plant,
  type PlantCreateRequest,
  type Zone,
} from "@/lib/api";
import { type PlantFormValues, plantFormSchema } from "@/lib/forms";
import { queryKeys } from "@/lib/queries";

const inputClass =
  "mt-2 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const healthOptions = [
  "healthy",
  "watch",
  "stressed",
  "critical",
  "dormant",
  "dead",
] as const;

export function PlantForm({
  mode,
  zones,
  initialPlant,
}: {
  mode: "create" | "edit";
  zones: Zone[];
  initialPlant?: Plant;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const form = useForm<PlantFormValues>({
    resolver: zodResolver(plantFormSchema),
    defaultValues: {
      zoneId: initialPlant?.zoneId ?? "",
      name: initialPlant?.name ?? "",
      code: initialPlant?.code ?? "",
      currentHealthStatus: initialPlant?.currentHealthStatus ?? "healthy",
      plantedAt: initialPlant?.plantedAt ?? "",
      acquiredAt: initialPlant?.acquiredAt ?? "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: PlantFormValues) => {
      const payload: PlantCreateRequest = {
        zoneId: values.zoneId || null,
        name: values.name,
        code: values.code || null,
        currentHealthStatus: values.currentHealthStatus,
        plantedAt: values.plantedAt || null,
        acquiredAt: values.acquiredAt || null,
      };
      const response =
        mode === "edit" && initialPlant
          ? await updatePlant(initialPlant.id, payload)
          : await createPlant(payload);

      if (response.status !== 200 && response.status !== 201) {
        throw new Error(`Plant save failed with status ${response.status}`);
      }

      return response.data;
    },
    onSuccess: async (plant) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.plants });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.plant(plant.id),
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.plantTimeline(plant.id),
      });
      router.push(`/plants/${plant.id}`);
    },
  });

  return (
    <form
      className="grid gap-4"
      onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
    >
      <FieldError message={mutation.error?.message} />

      <div>
        <Label htmlFor="name">Name</Label>
        <Input id="name" {...form.register("name")} className="mt-2" />
        <FieldError message={form.formState.errors.name?.message} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="code">Code</Label>
          <Input id="code" {...form.register("code")} className="mt-2" />
        </div>
        <div>
          <Label htmlFor="zoneId">Zone</Label>
          <select
            id="zoneId"
            {...form.register("zoneId")}
            className={inputClass}
          >
            <option value="">Unassigned</option>
            {zones.map((zone) => (
              <option key={zone.id} value={zone.id}>
                {zone.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <Label htmlFor="currentHealthStatus">Health</Label>
          <select
            id="currentHealthStatus"
            {...form.register("currentHealthStatus")}
            className={inputClass}
          >
            {healthOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="plantedAt">Planted at</Label>
          <Input
            id="plantedAt"
            type="date"
            {...form.register("plantedAt")}
            className="mt-2"
          />
        </div>
        <div>
          <Label htmlFor="acquiredAt">Acquired at</Label>
          <Input
            id="acquiredAt"
            type="date"
            {...form.register("acquiredAt")}
            className="mt-2"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button disabled={mutation.isPending} type="submit">
          {mode === "edit" ? "Save plant" : "Create plant"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            router.push(initialPlant ? `/plants/${initialPlant.id}` : "/plants")
          }
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}

function FieldError({ message }: { message?: string }) {
  return message ? (
    <p className="mt-2 text-xs text-red-600 dark:text-red-300">{message}</p>
  ) : null;
}
