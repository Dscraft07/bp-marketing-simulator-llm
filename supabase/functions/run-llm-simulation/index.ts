// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

console.log("run-llm-simulation Edge Function initialized");

interface SimulationRequest {
  simulationId: string;
}

Deno.serve(async (req) => {
  try {
    // Parse request body
    const { simulationId }: SimulationRequest = await req.json();

    if (!simulationId) {
      return new Response(
        JSON.stringify({ error: "simulationId is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing simulation: ${simulationId}`);

    // Get environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const xApiKey = Deno.env.get("X_API_KEY");

    if (!xApiKey) {
      console.error("X_API_KEY not set");
      return new Response(
        JSON.stringify({ error: "X_API_KEY not configured" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client with service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch simulation data
    const { data: simulation, error: simError } = await supabase
      .from("simulations")
      .select("*")
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
    console.log(`Campaign: ${simulation.campaign_snapshot.name}`);
    console.log(`Target Group: ${simulation.target_group_snapshot.name}`);
    console.log(`Persona Count: ${simulation.target_group_snapshot.persona_count}`);

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

    // TODO: Implement LLM simulation logic here
    // - Generate personas based on target group description
    // - For each persona, generate response to campaign content using x.ai API (grok-beta)
    // - Store results in simulation_results table
    // - Update simulation status to 'completed' or 'failed'

    // For now, just return success
    return new Response(
      JSON.stringify({
        success: true,
        message: "Simulation processing started",
        simulationId,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in run-llm-simulation:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: "Internal server error", details: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

/* To invoke locally:

  1. Run `supabase start`
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/run-llm-simulation' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"simulationId":"your-simulation-id-here"}'

*/
