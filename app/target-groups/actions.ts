"use server";

import { createClient } from "@/lib/supabase/server";
import { targetGroupSchema } from "@/lib/validation/targetGroupSchema";
import { revalidatePath } from "next/cache";

export async function createTargetGroup(formData: FormData) {
  const supabase = await createClient();

  // Check if user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error: "Unauthorized. Please sign in to create a target group.",
    };
  }

  // Extract and validate form data
  const rawData = {
    name: formData.get("name"),
    description: formData.get("description"),
    persona_count: formData.get("persona_count")
      ? Number(formData.get("persona_count"))
      : 5,
  };

  const validationResult = targetGroupSchema.safeParse(rawData);

  if (!validationResult.success) {
    return {
      error: validationResult.error.issues[0].message,
    };
  }

  const { name, description, persona_count } = validationResult.data;

  // Insert target group into database
  const { data, error } = await supabase
    .from("target_groups")
    .insert({
      name,
      description,
      persona_count,
      user_id: user.id,
    })
    .select()
    .single();

  if (error) {
    console.error("Supabase error:", error);
    return {
      error: `Failed to create target group: ${error.message}`,
    };
  }

  revalidatePath("/target-groups");

  return {
    success: true,
    data,
  };
}
