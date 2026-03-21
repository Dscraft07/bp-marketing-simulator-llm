import { z } from "zod";

export const apiKeySchema = z.object({
  provider: z.enum(["openai", "xai"]),
  apiKey: z.string().min(1, "API key is required"),
});

export type ApiKeyFormData = z.infer<typeof apiKeySchema>;
