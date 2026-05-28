"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  createZone,
  updateZone,
  type Zone,
  type ZoneCreateRequest,
} from "@/lib/api";
import { type ZoneFormValues, zoneFormSchema } from "@/lib/forms";
import { queryKeys } from "@/lib/queries";
import { cn } from "@/lib/utils";

const inputClass =
  "mt-2 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function ZoneForm({
  mode,
  initialZone,
}: {
  mode: "create" | "edit";
  initialZone?: Zone;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const form = useForm<ZoneFormValues>({
    resolver: zodResolver(zoneFormSchema),
    defaultValues: {
      growAreaId: initialZone?.growAreaId ?? "",
      name: initialZone?.name ?? "",
      slug: initialZone?.slug ?? "",
      description: initialZone?.description ?? "",
      environmentType: initialZone?.environmentType ?? "indoor",
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: ZoneFormValues) => {
      const payload: ZoneCreateRequest = {
        growAreaId: values.growAreaId,
        name: values.name,
        slug: values.slug,
        description: values.description || null,
        environmentType: values.environmentType || "indoor",
      };
      const response =
        mode === "edit" && initialZone
          ? await updateZone(initialZone.id, payload)
          : await createZone(payload);

      if (response.status !== 200 && response.status !== 201) {
        throw new Error(`Zone save failed with status ${response.status}`);
      }

      return response.data;
    },
    onSuccess: async (zone) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.zones });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.zone(zone.id),
      });
      router.push(`/zones/${zone.id}`);
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
          <Label htmlFor="slug">Slug</Label>
          <Input id="slug" {...form.register("slug")} className="mt-2" />
          <FieldError message={form.formState.errors.slug?.message} />
        </div>
        <div>
          <Label htmlFor="environmentType">Environment</Label>
          <select
            id="environmentType"
            {...form.register("environmentType")}
            className={inputClass}
          >
            <option value="indoor">Indoor</option>
            <option value="greenhouse">Greenhouse</option>
            <option value="propagation">Propagation</option>
            <option value="outdoor">Outdoor</option>
          </select>
        </div>
      </div>

      <div>
        <Label htmlFor="growAreaId">Grow area ID</Label>
        <Input
          id="growAreaId"
          {...form.register("growAreaId")}
          className="mt-2"
          placeholder="UUID"
        />
        <FieldError message={form.formState.errors.growAreaId?.message} />
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          {...form.register("description")}
          className="mt-2"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button disabled={mutation.isPending} type="submit">
          {mode === "edit" ? "Save zone" : "Create zone"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            router.push(initialZone ? `/zones/${initialZone.id}` : "/zones")
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
    <p className={cn("mt-2 text-xs text-red-600 dark:text-red-300")}>
      {message}
    </p>
  ) : null;
}
