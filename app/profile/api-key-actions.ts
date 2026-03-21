"use server";

import { createClient } from "@/lib/supabase/server";
import { apiKeySchema } from "@/lib/validation/apiKeySchema";
import { revalidatePath } from "next/cache";

interface ApiKeyHint {
  provider: string;
  key_hint: string;
  updated_at: string;
}

export async function getUserApiKeyHints(): Promise<{
  success?: boolean;
  error?: string;
  data?: ApiKeyHint[];
}> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized. Please sign in." };
  }

  const { data, error } = await supabase
    .from("user_api_keys")
    .select("provider, key_hint, updated_at")
    .eq("user_id", user.id);

  if (error) {
    console.error("Failed to fetch API key hints:", error);
    return { error: "Failed to fetch API keys." };
  }

  return { success: true, data: data as ApiKeyHint[] };
}

export async function upsertApiKey(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Unauthorized. Please sign in." };
  }

  const rawData = {
    provider: formData.get("provider"),
    apiKey: formData.get("apiKey"),
  };

  const validationResult = apiKeySchema.safeParse(rawData);

  if (!validationResult.success) {
    return {
      success: false,
      error: validationResult.error.issues[0].message,
    };
  }

  const { provider, apiKey } = validationResult.data;
  const keyHint = "..." + apiKey.slice(-4);

  const { error } = await supabase
    .from("user_api_keys")
    .upsert(
      {
        user_id: user.id,
        provider,
        api_key: apiKey,
        key_hint: keyHint,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,provider" }
    );

  if (error) {
    console.error("Failed to save API key:", error);
    return { success: false, error: "Failed to save API key." };
  }

  revalidatePath("/profile");

  return { success: true };
}

export async function deleteApiKey(provider: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Unauthorized. Please sign in." };
  }

  const { error } = await supabase
    .from("user_api_keys")
    .delete()
    .eq("user_id", user.id)
    .eq("provider", provider);

  if (error) {
    console.error("Failed to delete API key:", error);
    return { success: false, error: "Failed to delete API key." };
  }

  revalidatePath("/profile");

  return { success: true };
}

export async function hasApiKeyForProvider(
  userId: string,
  provider: string
): Promise<boolean> {
  const supabase = await createClient();

  const { count, error } = await supabase
    .from("user_api_keys")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("provider", provider);

  if (error) {
    console.error("Failed to check API key:", error);
    return false;
  }

  return (count ?? 0) > 0;
}
