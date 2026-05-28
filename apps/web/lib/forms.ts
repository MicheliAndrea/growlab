import { z } from "zod";

export const zoneFormSchema = z.object({
  growAreaId: z.string().uuid(),
  name: z.string().min(1),
  slug: z.string().min(1),
  environmentType: z.string().min(1),
  description: z.string().optional(),
});

export type ZoneFormValues = z.infer<typeof zoneFormSchema>;

export const plantFormSchema = z.object({
  zoneId: z.string().optional(),
  name: z.string().min(1),
  code: z.string().optional(),
  currentHealthStatus: z.enum([
    "healthy",
    "watch",
    "stressed",
    "critical",
    "dormant",
    "dead",
  ]),
  plantedAt: z.string().optional(),
  acquiredAt: z.string().optional(),
});

export type PlantFormValues = z.infer<typeof plantFormSchema>;

export const plantEventFormSchema = z.object({
  eventType: z.string().min(1),
  occurredAt: z.string().optional(),
  notes: z.string().optional(),
});

export type PlantEventFormValues = z.infer<typeof plantEventFormSchema>;
