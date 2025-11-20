import { z } from "zod";

export const socialPlatforms = [
  { value: "twitter", label: "Twitter / X" },
  { value: "facebook", label: "Facebook" },
  { value: "instagram", label: "Instagram" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "tiktok", label: "TikTok" },
] as const;

export const campaignSchema = z.object({
  name: z
    .string()
    .min(3, "Campaign name must be at least 3 characters long")
    .max(255, "Campaign name must not exceed 255 characters"),
  content: z
    .string()
    .min(10, "Campaign content must be at least 10 characters long"),
  social_platform: z.enum(["twitter", "facebook", "instagram", "linkedin", "tiktok"]),
});

export type CampaignFormData = z.infer<typeof campaignSchema>;
