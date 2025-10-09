import { z } from "zod";

export const targetGroupSchema = z.object({
  name: z
    .string()
    .min(3, "Target group name must be at least 3 characters long")
    .max(255, "Target group name must not exceed 255 characters"),
  description: z
    .string()
    .min(10, "Description must be at least 10 characters long"),
  persona_count: z
    .number()
    .int("Persona count must be a whole number")
    .min(1, "Persona count must be at least 1")
    .max(100, "Persona count must not exceed 100"),
});

export type TargetGroupFormData = z.infer<typeof targetGroupSchema>;
