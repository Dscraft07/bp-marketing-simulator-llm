/**
 * Server Actions pro simulace
 * 
 * Tento modul obsahuje server-side funkce pro správu simulací.
 * Server Actions jsou volány z klientských komponent a běží na serveru,
 * což umožňuje bezpečný přístup k databázi a autentizaci.
 */

"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { hasApiKeyForProvider } from "@/app/profile/api-key-actions";

/** Výsledek operace spuštění simulace */
interface RunSimulationResult {
  success: boolean;
  simulationId?: string;
  error?: string;
}

/**
 * Spustí novou simulaci marketingové kampaně.
 * 
 * Proces:
 * 1. Ověří přihlášení uživatele
 * 2. Načte data kampaně a cílové skupiny
 * 3. Vytvoří snapshoty (kopie dat v době simulace)
 * 4. Vytvoří záznam simulace v DB se statusem "pending"
 * 5. Asynchronně zavolá Edge Function pro zpracování
 * 
 * @param campaignId - ID kampaně k simulaci
 * @param targetGroupId - ID cílové skupiny
 * @param socialPlatform - Platforma (twitter, facebook, instagram, linkedin, tiktok)
 * @param llmModel - ID modelu ve formátu "provider/model" (např. "openai/gpt-4o")
 */
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
    // Pre-flight check: verify user has API key for the selected provider
    const provider = llmModel.split("/")[0];
    const providerLabels: Record<string, string> = {
      openai: "OpenAI",
      xai: "xAI (Grok)",
    };
    const hasKey = await hasApiKeyForProvider(user.id, provider);
    if (!hasKey) {
      return {
        success: false,
        error: `Please configure your ${providerLabels[provider] || provider} API key in Profile settings before running a simulation.`,
      };
    }

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

    // Fire-and-forget: invoke the Edge Function without awaiting the response.
    // This allows the user to be redirected to the simulation detail page immediately
    // while the LLM processes in the background. The detail page uses Realtime
    // subscriptions and polling to track progress.
    supabase.functions
      .invoke("run-llm-simulation", {
        body: { simulationId: simulation.id },
      })
      .then(({ error }) => {
        if (error) console.error("Edge Function error:", error);
      })
      .catch((err) => {
        console.error("Failed to invoke Edge Function:", err);
      });

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
