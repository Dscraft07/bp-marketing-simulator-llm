/**
 * Supabase Edge Function: run-llm-simulation
 * 
 * Tato funkce je jádrem simulačního systému. Volá se asynchronně po vytvoření
 * nové simulace a má na starosti:
 * 1. Načtení dat simulace z databáze
 * 2. Sestavení promptů pro LLM
 * 3. Volání příslušného LLM API (OpenAI, Anthropic, Google, xAI)
 * 4. Parsování a validaci odpovědi
 * 5. Uložení výsledků zpět do databáze
 * 
 * Podporované modely jsou definovány v MODEL_CONFIGS a zahrnují poskytovatele
 * OpenAI, Anthropic, Google Gemini a xAI (Grok).
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

console.log("run-llm-simulation Edge Function initialized");

// ============================================================================
// TYPY A ROZHRANÍ
// ============================================================================

/** Vstupní data pro Edge Function */
interface SimulationRequest {
  simulationId: string;
}

/** Struktura jedné reakce persony vrácené z LLM */
interface PersonaReaction {
  persona_name: string;      // Název/popis persony (např. "Tech-Savvy Millennial")
  content: string;           // Text reakce v první osobě
  sentiment: "positive" | "negative" | "neutral";  // Sentiment reakce
  relevance_score: number;   // Relevance kampaně pro personu (0-1)
  toxicity_score: number;    // Míra toxicity reakce (0-1, typicky nízká)
}

/** Očekávaný formát odpovědi z LLM */
interface LLMResponse {
  reactions: PersonaReaction[];
}

// ============================================================================
// KONFIGURACE MODELŮ
// ============================================================================

/** Podporovaní poskytovatelé LLM */
type Provider = "openai" | "anthropic" | "google" | "xai";

/** Konfigurace pro mapování model ID na poskytovatele a API model */
interface ModelConfig {
  provider: Provider;
  apiModel: string;  // Název modelu pro API volání
}

/**
 * Mapování model ID (ve formátu "provider/model") na konfiguraci.
 * Tyto ID se ukládají do databáze a zobrazují v UI.
 */
const MODEL_CONFIGS: Record<string, ModelConfig> = {
  // xAI (Grok)
  "xai/grok-3-mini-fast": { provider: "xai", apiModel: "grok-3-mini-fast" },
  "xai/grok-3-fast": { provider: "xai", apiModel: "grok-3-fast" },
  // OpenAI
  "openai/gpt-4o-mini": { provider: "openai", apiModel: "gpt-4o-mini" },
  "openai/gpt-4o": { provider: "openai", apiModel: "gpt-4o" },
  // Anthropic (Claude)
  "anthropic/claude-3-5-haiku-latest": { provider: "anthropic", apiModel: "claude-3-5-haiku-latest" },
  "anthropic/claude-sonnet-4-20250514": { provider: "anthropic", apiModel: "claude-sonnet-4-20250514" },
  // Google (Gemini)
  "google/gemini-2.0-flash": { provider: "google", apiModel: "gemini-2.0-flash" },
  "google/gemini-2.5-flash-preview-05-20": { provider: "google", apiModel: "gemini-2.5-flash-preview-05-20" },
};

// ============================================================================
// GENEROVÁNÍ PROMPTŮ
// ============================================================================

/**
 * Sestaví systémový a uživatelský prompt pro LLM.
 * 
 * Systémový prompt definuje:
 * - Roli modelu (marketingový analytik)
 * - Požadovaný formát výstupu (JSON)
 * - Pravidla pro generování reakcí (první osoba, styl platformy)
 * - Hodnotící kritéria (sentiment, relevance, toxicita)
 * 
 * Uživatelský prompt obsahuje konkrétní data kampaně a cílové skupiny.
 */
function buildPrompts(
  campaignName: string,
  campaignContent: string,
  socialPlatform: string,
  targetGroupName: string,
  targetGroupDescription: string,
  personaCount: number
): { systemPrompt: string; userPrompt: string } {
  // Mapování interních hodnot platform na zobrazované názvy
  const platformDisplayNames: Record<string, string> = {
    twitter: "Twitter/X",
    facebook: "Facebook",
    instagram: "Instagram",
    linkedin: "LinkedIn",
    tiktok: "TikTok",
  };

  const platformName = platformDisplayNames[socialPlatform] || socialPlatform;

  // Systémový prompt - definuje chování a formát výstupu
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

  // Uživatelský prompt - konkrétní data pro simulaci
  const userPrompt = `Generate ${personaCount} persona reactions for this marketing campaign on ${platformName}:

CAMPAIGN NAME: ${campaignName}

CAMPAIGN CONTENT:
${campaignContent}

TARGET GROUP: ${targetGroupName}
DESCRIPTION: ${targetGroupDescription}

Generate exactly ${personaCount} unique personas with first-person reactions. Return only JSON.`;

  return { systemPrompt, userPrompt };
}

// ============================================================================
// API VOLÁNÍ - OPENAI KOMPATIBILNÍ (OpenAI, xAI)
// ============================================================================

/**
 * Volá OpenAI-kompatibilní API (funguje pro OpenAI i xAI/Grok).
 * Používá JSON mode pro strukturovaný výstup.
 */
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
      response_format: { type: "json_object" },  // Vynutí JSON výstup
      temperature: 0.7,  // Mírná kreativita pro rozmanitost reakcí
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

// ============================================================================
// API VOLÁNÍ - ANTHROPIC (Claude)
// ============================================================================

/**
 * Volá Anthropic Messages API pro modely Claude.
 * Anthropic má jiný formát než OpenAI - používá system jako samostatný parametr.
 */
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
      system: systemPrompt,  // System prompt je samostatný parametr
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

  // Claude někdy obaluje JSON do markdown code blocks - odstraníme je
  const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  return JSON.parse(cleaned);
}

// ============================================================================
// API VOLÁNÍ - GOOGLE (Gemini)
// ============================================================================

/**
 * Volá Google Generative AI API pro modely Gemini.
 * Používá responseMimeType pro vynucení JSON výstupu.
 */
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
          responseMimeType: "application/json",  // Vynutí JSON výstup
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

// ============================================================================
// ROUTER PRO LLM VOLÁNÍ
// ============================================================================

/**
 * Hlavní router pro volání LLM API.
 * Na základě model ID vybere správného poskytovatele a zavolá příslušnou funkci.
 * API klíče se načítají z environment variables (Supabase Secrets).
 */
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

// ============================================================================
// HLAVNÍ HANDLER
// ============================================================================

/**
 * Entry point Edge Function.
 * Zpracovává HTTP POST požadavky s ID simulace.
 */
Deno.serve(async (req) => {
  try {
    // Parsování vstupních dat
    const { simulationId }: SimulationRequest = await req.json();

    if (!simulationId) {
      return new Response(
        JSON.stringify({ error: "simulationId is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing simulation: ${simulationId}`);

    // Inicializace Supabase klienta s service role key (plná práva)
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Načtení dat simulace včetně snapshotů kampaně a cílové skupiny
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

    // Výchozí model pokud není specifikován
    const modelId = simulation.model || "xai/grok-3-mini-fast";
    console.log(`Model: ${modelId}`);

    // Aktualizace statusu na "running"
    await supabase.from("simulations").update({ status: "running" }).eq("id", simulationId);

    // Sestavení promptů z dat simulace
    const { systemPrompt, userPrompt } = buildPrompts(
      simulation.campaign_snapshot.name,
      simulation.campaign_snapshot.content,
      simulation.campaign_snapshot.social_platform || "twitter",
      simulation.target_group_snapshot.name,
      simulation.target_group_snapshot.description,
      simulation.target_group_snapshot.persona_count
    );

    // Volání LLM a zpracování odpovědi
    let llmResponse: LLMResponse;
    try {
      llmResponse = await callLLM(modelId, systemPrompt, userPrompt);
      console.log(`Generated ${llmResponse.reactions.length} reactions`);
    } catch (apiError) {
      // Při chybě LLM - uložit error a ukončit
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

    // Uložení výsledků do tabulky simulation_results
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

    // Úspěšné dokončení - aktualizace statusu
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
