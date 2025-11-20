"use server";

import { createClient } from "@/lib/supabase/server";
import { campaignSchema } from "@/lib/validation/campaignSchema";
import { revalidatePath } from "next/cache";

export async function createCampaign(formData: FormData) {
  const supabase = await createClient();

  // Check if user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error: "Unauthorized. Please sign in to create a campaign.",
    };
  }

  // Extract and validate form data
  const rawData = {
    name: formData.get("name"),
    content: formData.get("content"),
    social_platform: formData.get("social_platform"),
  };

  const validationResult = campaignSchema.safeParse(rawData);

  if (!validationResult.success) {
    return {
      error: validationResult.error.issues[0].message,
    };
  }

  const { name, content, social_platform } = validationResult.data;

  // Insert campaign into database
  const { data, error } = await supabase
    .from("campaigns")
    .insert({
      name,
      content,
      social_platform,
      user_id: user.id,
    })
    .select()
    .single();

  if (error) {
    console.error("Supabase error:", error);
    return {
      error: `Failed to create campaign: ${error.message}`,
    };
  }

  revalidatePath("/campaigns");

  return {
    success: true,
    data,
  };
}

export async function deleteCampaign(campaignId: string) {
  const supabase = await createClient();

  // Check if user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      error: "Unauthorized. Please sign in to delete a campaign.",
    };
  }

  // Delete campaign (must be owned by user)
  const { error } = await supabase
    .from("campaigns")
    .delete()
    .eq("id", campaignId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Supabase error:", error);
    return {
      success: false,
      error: `Failed to delete campaign: ${error.message}`,
    };
  }

  revalidatePath("/dashboard");

  return {
    success: true,
  };
}
