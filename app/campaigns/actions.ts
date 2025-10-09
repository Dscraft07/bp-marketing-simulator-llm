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
  };

  const validationResult = campaignSchema.safeParse(rawData);

  if (!validationResult.success) {
    return {
      error: validationResult.error.issues[0].message,
    };
  }

  const { name, content } = validationResult.data;

  // Insert campaign into database
  const { data, error } = await supabase
    .from("campaigns")
    .insert({
      name,
      content,
      user_id: user.id,
    })
    .select()
    .single();

  if (error) {
    return {
      error: "Failed to create campaign. Please try again.",
    };
  }

  revalidatePath("/campaigns");

  return {
    success: true,
    data,
  };
}
