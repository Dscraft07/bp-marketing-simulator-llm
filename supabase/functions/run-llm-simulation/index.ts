// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

console.log("run-llm-simulation Edge Function initialized");

interface SimulationRequest {
  simulationId: string;
}

interface PersonaReaction {
  persona_name: string; // e.g., "Tech-Savvy Millennial", "Budget-Conscious Parent"
  content: string; // The actual reaction/response text
  sentiment: "positive" | "negative" | "neutral";
  relevance_score: number; // 0-1: How relevant is the campaign to this persona
  toxicity_score: number; // 0-1: How toxic/negative is the reaction (should be low)
}

interface LLMResponse {
  reactions: PersonaReaction[];
}

/**
 * Builds prompts for Grok to generate persona reactions to a marketing campaign
 */
function buildPrompts(
  campaignName: string,
  campaignContent: string,
  socialPlatform: string,
  targetGroupName: string,
  targetGroupDescription: string,
  personaCount: number
): { systemPrompt: string; userPrompt: string } {
  // Map platform values to display names
  const platformDisplayNames: Record<string, string> = {
    twitter: "Twitter/X",
    facebook: "Facebook",
    instagram: "Instagram",
    linkedin: "LinkedIn",
    tiktok: "TikTok",
  };

  const platformName = platformDisplayNames[socialPlatform] || socialPlatform;

  const systemPrompt = `You are an expert marketing analyst specializing in consumer behavior and persona simulation. Your task is to generate realistic reactions from diverse personas to marketing campaigns on ${platformName}.

CRITICAL INSTRUCTIONS:
1. Generate exactly ${personaCount} unique personas based on the provided target group description
2. Each persona must be distinct with their own characteristics, demographics, and mindset
3. For each persona, write their reaction as a FIRST-PERSON COMMENT (using "I", "my", "me") - as if they are directly commenting on the campaign ON ${platformName.toUpperCase()}
4. PLATFORM-SPECIFIC STYLE - Adapt comment style to ${platformName}:
   ${socialPlatform === 'twitter' ? '- Keep comments concise (under 280 characters ideal), use casual tone, hashtags acceptable' : ''}
   ${socialPlatform === 'facebook' ? '- More conversational, can be longer, emojis common, personal anecdotes welcome' : ''}
   ${socialPlatform === 'instagram' ? '- Visual-focused reactions, use emojis, shorter comments, trendy language' : ''}
   ${socialPlatform === 'linkedin' ? '- Professional tone, thoughtful insights, business-oriented perspective' : ''}
   ${socialPlatform === 'tiktok' ? '- Very casual, Gen-Z style, short and punchy, trendy slang acceptable' : ''}
5. Analyze sentiment (positive, negative, or neutral), relevance, and toxicity
6. Your response MUST be valid JSON only, no additional text or explanation

OUTPUT FORMAT (strict JSON):
{
  "reactions": [
    {
      "persona_name": "Descriptive persona name (e.g., 'Tech-Savvy Millennial', 'Budget-Conscious Parent')",
      "content": "Write as a FIRST-PERSON comment/reaction in the persona's voice. Use 'I', 'my', 'me'. Write naturally as if this person is commenting on social media or leaving feedback. Include their honest thoughts, feelings, and whether they would engage with this campaign. Be authentic and conversational.",
      "sentiment": "positive|negative|neutral",
      "relevance_score": 0.85,
      "toxicity_score": 0.05
    }
  ]
}

EXAMPLE OF CORRECT FIRST-PERSON FORMAT:
❌ BAD (third person): "Sarah, a 28-year-old teacher, finds this campaign interesting because..."
✅ GOOD (first person): "I'm a 28-year-old teacher and I find this really interesting! As someone who..."

SCORING GUIDELINES:
- relevance_score (0.0-1.0): How relevant is this campaign to the persona's needs/interests
  * 0.0-0.3: Not relevant at all
  * 0.4-0.6: Somewhat relevant
  * 0.7-1.0: Highly relevant
- toxicity_score (0.0-1.0): How toxic/offensive is the reaction (should typically be low)
  * 0.0-0.2: Professional, constructive feedback
  * 0.3-0.5: Slightly negative but acceptable
  * 0.6-1.0: Inappropriate, toxic (avoid unless justified)

Requirements:
- ALL reactions MUST be in first-person (I/my/me), never third-person (he/she/they)
- Be realistic and honest - not all personas will react positively
- Write in a natural, conversational tone as if posting a comment
- Include specific details about why they feel this way
- Consider demographics, psychographics, and behavioral patterns
- Scores should correlate with sentiment and content
- Response must be parseable JSON with no markdown formatting or code blocks`;

  const userPrompt = `Generate ${personaCount} persona reactions for the following marketing campaign that will be published on ${platformName}:

CAMPAIGN NAME: ${campaignName}

CAMPAIGN CONTENT:
${campaignContent}

SOCIAL PLATFORM: ${platformName}
(Adapt comment style, length, and tone to match typical ${platformName} user behavior)

TARGET GROUP: ${targetGroupName}
TARGET GROUP DESCRIPTION:
${targetGroupDescription}

Generate exactly ${personaCount} unique personas from this target group. Each persona should write their reaction in FIRST PERSON (using "I", "my", "me") as if they are commenting directly on this campaign ON ${platformName}. Make it sound like authentic ${platformName} comments with appropriate style, tone, and length for that platform. Return only the JSON response as specified in the system instructions.`;

  return { systemPrompt, userPrompt };
}

/**
 * Calls x.ai API (Grok) to generate persona reactions
 */
async function callGrokAPI(
  systemPrompt: string,
  userPrompt: string,
  apiKey: string
): Promise<LLMResponse> {
  const X_AI_API_URL = "https://api.x.ai/v1/chat/completions";

  console.log("Calling x.ai API...");

  const response = await fetch(X_AI_API_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "grok-4-fast-reasoning",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: userPrompt,
        },
      ],
      response_format: {
        type: "json_object",
      },
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("x.ai API error:", response.status, errorText);
    throw new Error(`x.ai API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  console.log("x.ai API response received");

  // Extract the content from the API response
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    console.error("No content in API response:", data);
    throw new Error("No content in x.ai API response");
  }

  // Parse the JSON content
  let parsedResponse: LLMResponse;
  try {
    parsedResponse = JSON.parse(content);
  } catch (error) {
    console.error("Failed to parse JSON response:", content);
    throw new Error(`Failed to parse JSON response: ${error.message}`);
  }

  // Validate the response structure
  if (!parsedResponse.reactions || !Array.isArray(parsedResponse.reactions)) {
    console.error("Invalid response structure:", parsedResponse);
    throw new Error("Invalid response structure: missing or invalid reactions array");
  }

  console.log(`Successfully parsed ${parsedResponse.reactions.length} persona reactions`);

  return parsedResponse;
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

    // Build prompts for Grok
    const { systemPrompt, userPrompt } = buildPrompts(
      simulation.campaign_snapshot.name,
      simulation.campaign_snapshot.content,
      simulation.campaign_snapshot.social_platform || "twitter",
      simulation.target_group_snapshot.name,
      simulation.target_group_snapshot.description,
      simulation.target_group_snapshot.persona_count
    );

    console.log("Prompts built successfully");
    console.log(`System prompt length: ${systemPrompt.length} chars`);
    console.log(`User prompt length: ${userPrompt.length} chars`);

    // Call x.ai API to generate persona reactions
    let llmResponse: LLMResponse;
    try {
      llmResponse = await callGrokAPI(systemPrompt, userPrompt, xApiKey);
      console.log(`Generated ${llmResponse.reactions.length} persona reactions`);
    } catch (apiError) {
      console.error("Failed to call Grok API:", apiError);

      // Update simulation status to 'failed'
      await supabase
        .from("simulations")
        .update({
          status: "failed",
          error_message: `API call failed: ${apiError.message}`,
          finished_at: new Date().toISOString(),
        })
        .eq("id", simulationId);

      return new Response(
        JSON.stringify({
          error: "Failed to generate persona reactions",
          details: apiError.message,
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

      // Update simulation status to 'failed'
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
        model: "grok-4-fast-reasoning",
      })
      .eq("id", simulationId);

    if (completeError) {
      console.error("Failed to update simulation status:", completeError);
      // Don't fail the whole operation - results are already saved
    } else {
      console.log("Simulation marked as completed");
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Simulation completed successfully",
        simulationId,
        reactionCount: llmResponse.reactions.length,
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

/* To invoke locally:

  1. Run `supabase start`
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/run-llm-simulation' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"simulationId":"your-simulation-id-here"}'

*/
