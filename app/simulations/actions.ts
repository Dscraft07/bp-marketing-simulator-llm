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
  targetGroupId: string
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

    // TODO: Call Supabase Edge Function to run the simulation
    // This will be implemented in the next phase
    // Example:
    // const { data: edgeResponse, error: edgeError } = await supabase.functions.invoke(
    //   'run-llm-simulation',
    //   {
    //     body: { simulationId: simulation.id }
    //   }
    // );

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
