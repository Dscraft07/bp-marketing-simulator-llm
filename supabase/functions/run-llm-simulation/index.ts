// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

console.log("run-llm-simulation Edge Function initialized");

interface SimulationRequest {
  simulationId: string;
}

interface PersonaReaction {
  persona_name: string;
  content: string;
  sentiment: "positive" | "negative" | "neutral";
  relevance_score: number;
  toxicity_score: number;
}

interface LLMAPIResponse {
  success: boolean;
  reactions: PersonaReaction[];
  model: string;
  error?: string;
  details?: string;
}

Deno.serve(async (req) => {
  try {
    const { simulationId }: SimulationRequest = await req.json();

    if (!simulationId) {
      return new Response(
        JSON.stringify({ error: "simulationId is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing simulation: ${simulationId}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const llmApiUrl = Deno.env.get("LLM_API_URL"); // Your Next.js app URL
    const edgeFunctionSecret = Deno.env.get("EDGE_FUNCTION_SECRET");

    if (!llmApiUrl) {
      console.error("LLM_API_URL not set");
      return new Response(
        JSON.stringify({ error: "LLM_API_URL not configured" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!edgeFunctionSecret) {
      console.error("EDGE_FUNCTION_SECRET not set");
      return new Response(
        JSON.stringify({ error: "EDGE_FUNCTION_SECRET not configured" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch simulation data to update status
    const { data: simulation, error: simError } = await supabase
      .from("simulations")
      .select("id, model")
      .eq("id", simulationId)
      .single();

    if (simError || !simulation) {
      console.error("Failed to fetch simulation:", simError);
      return new Response(
        JSON.stringify({ error: "Simulation not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log(`Loaded simulation: ${simulation.id}`);
    console.log(`Model: ${simulation.model}`);

    // Update simulation status to 'running'
    const { error: updateError } = await supabase
      .from("simulations")
      .update({ status: "running" })
      .eq("id", simulationId);

    if (updateError) {
      console.error("Failed to update simulation status to running:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update simulation status" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log(`Simulation status updated to 'running'`);

    // Call the Next.js API route that uses AI Gateway
    console.log(`Calling LLM API at: ${llmApiUrl}/api/llm`);
    
    let llmResponse: LLMAPIResponse;
    try {
      const response = await fetch(`${llmApiUrl}/api/llm`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          simulationId,
          secretKey: edgeFunctionSecret,
        }),
      });

      // Get raw response text first
      const responseText = await response.text();
      console.log(`LLM API response status: ${response.status}, length: ${responseText.length}`);

      if (!responseText) {
        throw new Error("Empty response from LLM API - possible timeout");
      }

      // Try to parse as JSON
      let parsedResponse;
      try {
        parsedResponse = JSON.parse(responseText);
      } catch (parseError) {
        console.error("Failed to parse response:", responseText.substring(0, 500));
        throw new Error(`Invalid JSON response: ${responseText.substring(0, 200)}`);
      }

      if (!response.ok) {
        throw new Error(parsedResponse.details || parsedResponse.error || `HTTP ${response.status}`);
      }

      llmResponse = parsedResponse;
      
      if (!llmResponse.success || !llmResponse.reactions) {
        throw new Error(llmResponse.error || llmResponse.details || "Invalid response from LLM API");
      }

      console.log(`Generated ${llmResponse.reactions.length} persona reactions`);
    } catch (apiError) {
      console.error("Failed to call LLM API:", apiError);

      await supabase
        .from("simulations")
        .update({
          status: "failed",
          error_message: `API call failed: ${apiError instanceof Error ? apiError.message : String(apiError)}`,
          finished_at: new Date().toISOString(),
        })
        .eq("id", simulationId);

      return new Response(
        JSON.stringify({
          error: "Failed to generate persona reactions",
          details: apiError instanceof Error ? apiError.message : String(apiError),
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Store results in simulation_results table
    console.log("Storing persona reactions in database...");

    const resultsToInsert = llmResponse.reactions.map((reaction) => ({
      simulation_id: simulationId,
      persona_name: reaction.persona_name,
      content: reaction.content,
      sentiment: reaction.sentiment,
      relevance_score: reaction.relevance_score,
      toxicity_score: reaction.toxicity_score,
    }));

    const { error: insertError } = await supabase
      .from("simulation_results")
      .insert(resultsToInsert);

    if (insertError) {
      console.error("Failed to insert simulation results:", insertError);

      await supabase
        .from("simulations")
        .update({
          status: "failed",
          error_message: `Failed to save results: ${insertError.message}`,
          finished_at: new Date().toISOString(),
        })
        .eq("id", simulationId);

      return new Response(
        JSON.stringify({
          error: "Failed to save simulation results",
          details: insertError.message,
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log(`Successfully saved ${resultsToInsert.length} results to database`);

    // Update simulation status to 'completed'
    const { error: completeError } = await supabase
      .from("simulations")
      .update({
        status: "completed",
        finished_at: new Date().toISOString(),
      })
      .eq("id", simulationId);

    if (completeError) {
      console.error("Failed to update simulation status:", completeError);
    } else {
      console.log("Simulation marked as completed");
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Simulation completed successfully",
        simulationId,
        reactionCount: llmResponse.reactions.length,
        model: llmResponse.model,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error in run-llm-simulation:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    return new Response(
      JSON.stringify({ error: "Internal server error", details: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
