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

interface LLMResponse {
  reactions: PersonaReaction[];
}

// Provider configurations
type Provider = "openai" | "anthropic" | "google" | "xai";

interface ModelConfig {
  provider: Provider;
  apiModel: string;
}

const MODEL_CONFIGS: Record<string, ModelConfig> = {
  "xai/grok-3-mini-fast": { provider: "xai", apiModel: "grok-3-mini-fast" },
  "xai/grok-3-fast": { provider: "xai", apiModel: "grok-3-fast" },
  "openai/gpt-4o-mini": { provider: "openai", apiModel: "gpt-4o-mini" },
  "openai/gpt-4o": { provider: "openai", apiModel: "gpt-4o" },
  "anthropic/claude-3-5-haiku-latest": { provider: "anthropic", apiModel: "claude-3-5-haiku-latest" },
  "anthropic/claude-sonnet-4-20250514": { provider: "anthropic", apiModel: "claude-sonnet-4-20250514" },
  "google/gemini-2.0-flash": { provider: "google", apiModel: "gemini-2.0-flash" },
  "google/gemini-2.5-flash-preview-05-20": { provider: "google", apiModel: "gemini-2.5-flash-preview-05-20" },
};

function buildPrompts(
  campaignName: string,
  campaignContent: string,
  socialPlatform: string,
  targetGroupName: string,
  targetGroupDescription: string,
  personaCount: number
): { systemPrompt: string; userPrompt: string } {
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
3. For each persona, write their reaction as a FIRST-PERSON COMMENT (using "I", "my", "me")
4. PLATFORM-SPECIFIC STYLE - Adapt comment style to ${platformName}:
   ${socialPlatform === 'twitter' ? '- Keep comments concise (under 280 characters ideal), use casual tone, hashtags acceptable' : ''}
   ${socialPlatform === 'facebook' ? '- More conversational, can be longer, emojis common, personal anecdotes welcome' : ''}
   ${socialPlatform === 'instagram' ? '- Visual-focused reactions, use emojis, shorter comments, trendy language' : ''}
   ${socialPlatform === 'linkedin' ? '- Professional tone, thoughtful insights, business-oriented perspective' : ''}
   ${socialPlatform === 'tiktok' ? '- Very casual, Gen-Z style, short and punchy, trendy slang acceptable' : ''}
5. Analyze sentiment (positive, negative, or neutral), relevance, and toxicity
6. Your response MUST be valid JSON only, no additional text

OUTPUT FORMAT (strict JSON):
{
  "reactions": [
    {
      "persona_name": "Descriptive persona name",
      "content": "First-person reaction using I/my/me",
      "sentiment": "positive|negative|neutral",
      "relevance_score": 0.85,
      "toxicity_score": 0.05
    }
  ]
}

SCORING GUIDELINES:
- relevance_score (0.0-1.0): How relevant is this campaign to the persona
- toxicity_score (0.0-1.0): How toxic/offensive is the reaction (typically low)

Requirements:
- ALL reactions in first-person (I/my/me), never third-person
- Be realistic - not all personas react positively
- Natural, conversational tone
- Response must be parseable JSON with no markdown`;

  const userPrompt = `Generate ${personaCount} persona reactions for this marketing campaign on ${platformName}:

CAMPAIGN NAME: ${campaignName}

CAMPAIGN CONTENT:
${campaignContent}

TARGET GROUP: ${targetGroupName}
DESCRIPTION: ${targetGroupDescription}

Generate exactly ${personaCount} unique personas with first-person reactions. Return only JSON.`;

  return { systemPrompt, userPrompt };
}

// OpenAI-compatible API (OpenAI, xAI)
async function callOpenAICompatible(
  baseUrl: string,
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string
): Promise<LLMResponse> {
  console.log(`Calling ${baseUrl} with model: ${model}`);

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("No content in response");

  return JSON.parse(content);
}

// Anthropic API
async function callAnthropic(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string
): Promise<LLMResponse> {
  console.log(`Calling Anthropic with model: ${model}`);

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Anthropic error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  const content = data.content?.[0]?.text;
  if (!content) throw new Error("No content in Anthropic response");

  const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  return JSON.parse(cleaned);
}

// Google Gemini API
async function callGoogle(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string
): Promise<LLMResponse> {
  console.log(`Calling Google Gemini with model: ${model}`);

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
        generationConfig: {
          temperature: 0.7,
          responseMimeType: "application/json",
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!content) throw new Error("No content in Google response");

  return JSON.parse(content);
}

async function callLLM(
  modelId: string,
  systemPrompt: string,
  userPrompt: string
): Promise<LLMResponse> {
  const config = MODEL_CONFIGS[modelId];
  if (!config) throw new Error(`Unknown model: ${modelId}`);

  switch (config.provider) {
    case "xai": {
      const apiKey = Deno.env.get("X_API_KEY");
      if (!apiKey) throw new Error("X_API_KEY not configured");
      return callOpenAICompatible("https://api.x.ai/v1", apiKey, config.apiModel, systemPrompt, userPrompt);
    }
    case "openai": {
      const apiKey = Deno.env.get("OPENAI_API_KEY");
      if (!apiKey) throw new Error("OPENAI_API_KEY not configured");
      return callOpenAICompatible("https://api.openai.com/v1", apiKey, config.apiModel, systemPrompt, userPrompt);
    }
    case "anthropic": {
      const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
      if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");
      return callAnthropic(apiKey, config.apiModel, systemPrompt, userPrompt);
    }
    case "google": {
      const apiKey = Deno.env.get("GOOGLE_API_KEY");
      if (!apiKey) throw new Error("GOOGLE_API_KEY not configured");
      return callGoogle(apiKey, config.apiModel, systemPrompt, userPrompt);
    }
  }
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
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

    const modelId = simulation.model || "xai/grok-3-mini-fast";
    console.log(`Model: ${modelId}`);

    // Update status to running
    await supabase.from("simulations").update({ status: "running" }).eq("id", simulationId);

    const { systemPrompt, userPrompt } = buildPrompts(
      simulation.campaign_snapshot.name,
      simulation.campaign_snapshot.content,
      simulation.campaign_snapshot.social_platform || "twitter",
      simulation.target_group_snapshot.name,
      simulation.target_group_snapshot.description,
      simulation.target_group_snapshot.persona_count
    );

    let llmResponse: LLMResponse;
    try {
      llmResponse = await callLLM(modelId, systemPrompt, userPrompt);
      console.log(`Generated ${llmResponse.reactions.length} reactions`);
    } catch (apiError) {
      console.error("LLM call failed:", apiError);
      await supabase.from("simulations").update({
        status: "failed",
        error_message: apiError instanceof Error ? apiError.message : String(apiError),
        finished_at: new Date().toISOString(),
      }).eq("id", simulationId);

      return new Response(
        JSON.stringify({ error: "LLM call failed", details: String(apiError) }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Save results
    const resultsToInsert = llmResponse.reactions.map((r) => ({
      simulation_id: simulationId,
      persona_name: r.persona_name,
      content: r.content,
      sentiment: r.sentiment,
      relevance_score: r.relevance_score,
      toxicity_score: r.toxicity_score,
    }));

    const { error: insertError } = await supabase.from("simulation_results").insert(resultsToInsert);

    if (insertError) {
      console.error("Failed to save results:", insertError);
      await supabase.from("simulations").update({
        status: "failed",
        error_message: insertError.message,
        finished_at: new Date().toISOString(),
      }).eq("id", simulationId);

      return new Response(
        JSON.stringify({ error: "Failed to save results", details: insertError.message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    await supabase.from("simulations").update({
      status: "completed",
      finished_at: new Date().toISOString(),
    }).eq("id", simulationId);

    console.log("Simulation completed successfully");

    return new Response(
      JSON.stringify({ success: true, simulationId, reactionCount: llmResponse.reactions.length }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal error", details: String(error) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
