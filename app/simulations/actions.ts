"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

interface RunSimulationResult {
  success: boolean;
  simulationId?: string;
  error?: string;
}

export async function runSimulation(
  campaignId: string,
  targetGroupId: string,
  socialPlatform: string,
  llmModel: string
): Promise<RunSimulationResult> {
  const supabase = await createClient();

  // Get authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      error: "You must be logged in to run a simulation",
    };
  }

  try {
    // Fetch campaign data
    const { data: campaign, error: campaignError } = await supabase
      .from("campaigns")
      .select("*")
      .eq("id", campaignId)
      .eq("user_id", user.id)
      .single();

    if (campaignError || !campaign) {
      return {
        success: false,
        error: "Campaign not found or access denied",
      };
    }

    // Fetch target group data
    const { data: targetGroup, error: targetGroupError } = await supabase
      .from("target_groups")
      .select("*")
      .eq("id", targetGroupId)
      .eq("user_id", user.id)
      .single();

    if (targetGroupError || !targetGroup) {
      return {
        success: false,
        error: "Target group not found or access denied",
      };
    }

    // Create snapshots of campaign and target group data
    const campaignSnapshot = {
      name: campaign.name,
      content: campaign.content,
      social_platform: socialPlatform,
    };

    const targetGroupSnapshot = {
      name: targetGroup.name,
      description: targetGroup.description,
      persona_count: targetGroup.persona_count,
    };

    // Insert new simulation record with 'pending' status
    const { data: simulation, error: simulationError } = await supabase
      .from("simulations")
      .insert({
        user_id: user.id,
        campaign_id: campaignId,
        target_group_id: targetGroupId,
        status: "pending",
        campaign_snapshot: campaignSnapshot,
        target_group_snapshot: targetGroupSnapshot,
        model: llmModel,
      })
      .select()
      .single();

    if (simulationError || !simulation) {
      console.error("Failed to create simulation:", simulationError);
      return {
        success: false,
        error: "Failed to create simulation",
      };
    }

    // Call Supabase Edge Function to run the simulation
    try {
      const { data: edgeResponse, error: edgeError } = await supabase.functions.invoke(
        'run-llm-simulation',
        {
          body: { simulationId: simulation.id }
        }
      );

      if (edgeError) {
        console.error("Edge Function error:", edgeError);
        // Don't fail the whole operation - simulation is created, just log the error
      } else {
        console.log("Edge Function response:", edgeResponse);
      }
    } catch (edgeError) {
      console.error("Failed to invoke Edge Function:", edgeError);
      // Don't fail the whole operation - simulation is created
    }

    // Revalidate the dashboard to show updated data
    revalidatePath("/dashboard");

    return {
      success: true,
      simulationId: simulation.id,
    };
  } catch (error) {
    console.error("Unexpected error in runSimulation:", error);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}

export async function deleteSimulation(simulationId: string) {
  const supabase = await createClient();

  // Check if user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      error: "Unauthorized. Please sign in to delete a simulation.",
    };
  }

  // Delete simulation (must be owned by user)
  // This will also cascade delete simulation_results due to FK constraint
  const { error } = await supabase
    .from("simulations")
    .delete()
    .eq("id", simulationId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Supabase error:", error);
    return {
      success: false,
      error: `Failed to delete simulation: ${error.message}`,
    };
  }

  revalidatePath("/simulations");

  return {
    success: true,
  };
}
