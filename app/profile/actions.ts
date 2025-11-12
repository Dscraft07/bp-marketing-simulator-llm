"use server";

import { createClient } from "@/lib/supabase/server";
import { profileSchema } from "@/lib/validation/profileSchema";
import { revalidatePath } from "next/cache";

interface ProfileData {
  id: string;
  username: string | null;
  created_at: string;
  updated_at: string;
}

export async function getProfile() {
  const supabase = await createClient();

  // Check if user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error: "Unauthorized. Please sign in to view your profile.",
    };
  }

  // Fetch profile
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error) {
    console.error("Supabase error:", error);
    return {
      error: `Failed to fetch profile: ${error.message}`,
    };
  }

  return {
    success: true,
    data: data as ProfileData,
  };
}

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();

  // Check if user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      error: "Unauthorized. Please sign in to update your profile.",
    };
  }

  // Extract and validate form data
  const rawData = {
    username: formData.get("username"),
  };

  const validationResult = profileSchema.safeParse(rawData);

  if (!validationResult.success) {
    return {
      success: false,
      error: validationResult.error.issues[0].message,
    };
  }

  const { username } = validationResult.data;

  // Update profile in database
  const { data, error } = await supabase
    .from("profiles")
    .update({ username })
    .eq("id", user.id)
    .select()
    .single();

  if (error) {
    console.error("Supabase error:", error);
    return {
      success: false,
      error: `Failed to update profile: ${error.message}`,
    };
  }

  revalidatePath("/profile");

  return {
    success: true,
    data: data as ProfileData,
  };
}
