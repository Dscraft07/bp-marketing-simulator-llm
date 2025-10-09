import { z } from "zod";

export const campaignSchema = z.object({
  name: z
    .string()
    .min(3, "Campaign name must be at least 3 characters long")
    .max(255, "Campaign name must not exceed 255 characters"),
  content: z
    .string()
    .min(10, "Campaign content must be at least 10 characters long"),
});

export type CampaignFormData = z.infer<typeof campaignSchema>;
