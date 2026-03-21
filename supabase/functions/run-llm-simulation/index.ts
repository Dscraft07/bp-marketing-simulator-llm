/**
 * Supabase Edge Function: run-llm-simulation
 *
 * Tato funkce je jádrem simulačního systému. Volá se asynchronně po vytvoření
 * nové simulace a má na starosti:
 * 1. Načtení dat simulace z databáze
 * 2. Sestavení promptů pro LLM (generování reakcí)
 * 3. Volání LLM API pro generování reakcí
 * 4. Druhé volání LLM API pro nezávislé hodnocení metrik (relevance, toxicity, purchase_intent)
 * 5. Uložení výsledků zpět do databáze
 *
 * Podporované modely jsou definovány v MODEL_CONFIGS a zahrnují poskytovatele
 * OpenAI a xAI (Grok).
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

/** Reakce persony z prvního LLM volání (generování) */
interface GeneratedReaction {
  persona_name: string;
  content: string;
  sentiment: "positive" | "negative" | "neutral";
}

/** Odpověď z prvního LLM volání */
interface GenerationResponse {
  reactions: GeneratedReaction[];
}

/** Hodnocení jedné reakce z druhého LLM volání (evaluace) */
interface EvaluatedScores {
  persona_name: string;
  relevance_score: number;
  toxicity_score: number;
  purchase_intent: number;
}

/** Odpověď z druhého LLM volání */
interface EvaluationResponse {
  evaluations: EvaluatedScores[];
}

// ============================================================================
// KONFIGURACE MODELŮ
// ============================================================================

/** Podporovaní poskytovatelé LLM */
type Provider = "openai" | "xai";

/** Konfigurace pro mapování model ID na poskytovatele a API model */
interface ModelConfig {
  provider: Provider;
  apiModel: string;
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
};

// ============================================================================
// GENEROVÁNÍ PROMPTŮ
// ============================================================================

function getPlatformDisplayName(socialPlatform: string): string {
  const platformDisplayNames: Record<string, string> = {
    twitter: "Twitter/X",
    facebook: "Facebook",
    instagram: "Instagram",
    linkedin: "LinkedIn",
    tiktok: "TikTok",
  };
  return platformDisplayNames[socialPlatform] || socialPlatform;
}

function getPlatformStyleGuide(socialPlatform: string): string {
  const guides: Record<string, string> = {
    twitter: `- Twitter/X style: Most comments are 1-2 sentences, punchy and opinionated. Some users write short threads (2-3 connected thoughts). Hashtags are common but not mandatory. Quote-tweet energy — people react TO the ad, not just about the topic. Sarcasm and hot takes are frequent. Some users tag friends or brands. Typical length: 30-200 characters, occasionally up to 280.`,
    facebook: `- Facebook style: Wide range of comment lengths. Some are quick reactions ("Love this!"), others are multi-paragraph personal stories. Older demographics tend to write longer, more earnest comments. Emojis are common. People share personal anecdotes and tag family/friends. Some commenters ask questions to the brand. Comment sections often have mini-debates. Typical length: 1 sentence to a full paragraph.`,
    instagram: `- Instagram style: Comments are typically short (1-3 sentences). Heavy emoji use — some comments are emoji-only. "Fire" reactions (🔥💯) are common for positive sentiment. Users tag friends ("@friend look at this"). Trendy slang and abbreviations. Negative comments tend to be blunt and short. Some users leave longer thoughtful comments on brand posts they care about. Typical length: 5-100 characters, occasionally longer.`,
    linkedin: `- LinkedIn style: Professional and measured tone. Comments range from brief endorsements ("Great initiative") to multi-paragraph thought leadership responses with personal professional experience. People often reference their industry knowledge, cite data, or share relevant work experience. Name-dropping companies or frameworks is common. Some users write contrarian takes to stand out. Humble-bragging occurs. Typical length: 1-4 sentences, occasionally longer with line breaks.`,
    tiktok: `- TikTok style: Very casual, Gen-Z and millennial energy. Short, punchy comments — often just a few words. Heavy use of slang ("no cap", "slay", "this is giving..."), internet humor, and references. All-caps for emphasis is common. Many comments are jokes or memes rather than direct opinions. Some users share brief personal takes. Negative reactions tend to be dismissive or sarcastic rather than analytical. Typical length: 3-50 characters, rarely longer.`,
  };
  return guides[socialPlatform] || "- Adapt to the platform's typical commenting style and norms.";
}

/**
 * Prompt pro první LLM volání — generování reakcí person.
 * Neobsahuje žádné skórovací instrukce, LLM pouze generuje reakce.
 */
function getLanguageLabel(language: string): string {
  const labels: Record<string, string> = {
    en: "English",
    cs: "Czech (čeština)",
  };
  return labels[language] || "English";
}

function buildGenerationPrompts(
  campaignName: string,
  campaignContent: string,
  socialPlatform: string,
  targetGroupName: string,
  targetGroupDescription: string,
  personaCount: number,
  language: string
): { systemPrompt: string; userPrompt: string } {
  const platformName = getPlatformDisplayName(socialPlatform);
  const platformGuide = getPlatformStyleGuide(socialPlatform);
  const languageLabel = getLanguageLabel(language);

  const languageInstruction = language !== "en"
    ? `\n\nLANGUAGE: ALL persona reactions (the "content" field) MUST be written in ${languageLabel}. Persona names should also be in ${languageLabel}. The JSON keys and sentiment values remain in English.`
    : "";

  const systemPrompt = `You are a social media simulation engine. Your job is to generate authentic, diverse reactions from ${personaCount} unique personas responding to a marketing campaign ad on ${platformName}.${languageInstruction}

PERSONA GENERATION:
- Create ${personaCount} distinct personas grounded in the target group description
- Each persona must have a unique background, motivation, and perspective — avoid generic archetypes
- Include a realistic mix: some are directly in the target audience, some are tangentially related, some may feel alienated by the campaign
- Persona names should hint at their key trait (e.g. "Budget-Conscious College Student", "Retired Engineer Who Distrusts Ads")

COMMENT AUTHENTICITY:
- Write each comment as if the persona literally typed it under the ad on ${platformName}
- Comments must be in FIRST PERSON (I/my/me)
- Vary comment length naturally — not every comment should be the same length:
  * Some personas leave quick 1-line reactions
  * Others share a personal anecdote or explain their reasoning in 2-4 sentences
  * A few might just leave a very short sharp take
- Include the natural imperfections of real social media: occasional casual grammar, emotional reactions, rhetorical questions, tagging behaviors
- Some personas should reference specific details from the campaign content, others react to the overall vibe
- Not every reaction needs a hashtag — use them only where it feels natural

PLATFORM-SPECIFIC STYLE:
${platformGuide}

SENTIMENT REALISM:
- Reflect a realistic distribution — campaigns rarely get 100% positive or 100% negative reception
- Positive reactions should vary: genuine excitement, mild approval, conditional support ("love the idea but...")
- Negative reactions should vary: concerned, annoyed, offended, dismissive, sarcastic
- Neutral reactions: indifferent, curious but uncommitted, asking questions, sharing without strong opinion

OUTPUT FORMAT (strict JSON, no markdown, no extra text):
{
  "reactions": [
    {
      "persona_name": "Descriptive Persona Name",
      "content": "The actual comment text as the persona would type it",
      "sentiment": "positive|negative|neutral"
    }
  ]
}

Generate EXACTLY ${personaCount} reactions. Count them carefully before responding.`;

  const userPrompt = `Campaign on ${platformName}:

CAMPAIGN: ${campaignName}

AD CONTENT:
${campaignContent}

TARGET AUDIENCE: ${targetGroupName}
AUDIENCE DESCRIPTION: ${targetGroupDescription}

Generate exactly ${personaCount} unique persona reactions. Return only JSON.`;

  return { systemPrompt, userPrompt };
}

/**
 * Prompt pro druhé LLM volání — nezávislé hodnocení metrik.
 * Dostane kampaň + vygenerované reakce a ohodnotí je.
 */
function buildEvaluationPrompts(
  campaignName: string,
  campaignContent: string,
  socialPlatform: string,
  targetGroupName: string,
  targetGroupDescription: string,
  reactions: GeneratedReaction[]
): { systemPrompt: string; userPrompt: string } {
  const platformName = getPlatformDisplayName(socialPlatform);

  const systemPrompt = `You are an independent marketing analytics evaluator. You will receive a campaign and a set of simulated persona reactions. Score each reaction on three metrics.

SCORING GUIDELINES:

1. RELEVANCE (relevance_score: 0.0-1.0)
   How relevant is this campaign to the persona based on their reaction and apparent profile.
   - 0.0-0.2: Campaign has nothing to do with this persona's interests or needs
   - 0.3-0.4: Tangentially related — persona is aware of the category but it's not for them
   - 0.5-0.6: Moderately relevant — persona is in a related demographic but not core audience
   - 0.7-0.8: Quite relevant — persona is clearly in the target audience
   - 0.9-1.0: Highly relevant — campaign directly addresses this persona's specific needs/desires

2. TOXICITY (toxicity_score: 0.0-1.0)
   How toxic, offensive, or hostile is the reaction text itself.
   - 0.0-0.05: Civil, respectful (even if negative opinion)
   - 0.06-0.15: Mildly snarky or dismissive but not harmful
   - 0.16-0.3: Rude, contains mild insults or aggressive tone
   - 0.31-0.6: Clearly hostile, contains strong insults or inflammatory language
   - 0.61-1.0: Hate speech, discrimination, threats, or extreme hostility

3. PURCHASE INTENT (purchase_intent: 0.0-1.0)
   How likely is this persona to purchase or use the product/service based on their reaction.
   - 0.0-0.1: Actively opposed, would never buy, may discourage others
   - 0.15-0.3: Unlikely — skeptical, uninterested, or the product doesn't fit their needs
   - 0.35-0.5: On the fence — curious but unconvinced, needs more info
   - 0.55-0.7: Likely — positive impression, considering it, may try it
   - 0.75-0.9: Very likely — enthusiastic, already planning to buy/try
   - 0.95-1.0: Immediate intent — "shut up and take my money" energy

IMPORTANT:
- Use the FULL range of each scale. Do not cluster scores.
- Each metric is independent — a toxic comment can still show high purchase intent, a highly relevant persona might still not want to buy.
- Base scores on what the reaction TEXT reveals, not assumptions.

OUTPUT FORMAT (strict JSON, no markdown):
{
  "evaluations": [
    {
      "persona_name": "Exact persona name from input",
      "relevance_score": 0.65,
      "toxicity_score": 0.02,
      "purchase_intent": 0.15
    }
  ]
}

Evaluate ALL reactions. Use exact persona_name from the input.`;

  const reactionsText = reactions.map((r, i) =>
    `${i + 1}. [${r.persona_name}] (sentiment: ${r.sentiment})\n   "${r.content}"`
  ).join("\n\n");

  const userPrompt = `Evaluate these persona reactions to a marketing campaign on ${platformName}:

CAMPAIGN: ${campaignName}

AD CONTENT:
${campaignContent}

TARGET AUDIENCE: ${targetGroupName}
DESCRIPTION: ${targetGroupDescription}

---

REACTIONS TO EVALUATE:

${reactionsText}

Return evaluation scores as JSON.`;

  return { systemPrompt, userPrompt };
}

// ============================================================================
// API VOLÁNÍ - OPENAI KOMPATIBILNÍ (OpenAI, xAI)
// ============================================================================

/**
 * Volá OpenAI-kompatibilní API a vrací parsovaný JSON.
 */
async function callOpenAICompatibleRaw<T>(
  baseUrl: string,
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string
): Promise<T> {
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

// ============================================================================
// ROUTER PRO LLM VOLÁNÍ
// ============================================================================

/** Base URL pro každého poskytovatele */
const PROVIDER_BASE_URLS: Record<Provider, string> = {
  openai: "https://api.openai.com/v1",
  xai: "https://api.x.ai/v1",
};

/**
 * Získá API klíč uživatele pro daného poskytovatele.
 */
async function getUserApiKey(
  provider: Provider,
  supabase: ReturnType<typeof createClient>,
  userId: string
): Promise<string> {
  const { data: keyRow, error: keyError } = await supabase
    .from("user_api_keys")
    .select("api_key")
    .eq("user_id", userId)
    .eq("provider", provider)
    .single();

  if (keyError || !keyRow?.api_key) {
    throw new Error(
      `API key for ${provider} not configured. Please add your API key in Profile settings.`
    );
  }

  return keyRow.api_key;
}

/**
 * Volá LLM API s generickým návratovým typem.
 */
async function callLLM<T>(
  modelId: string,
  systemPrompt: string,
  userPrompt: string,
  supabase: ReturnType<typeof createClient>,
  userId: string
): Promise<T> {
  const config = MODEL_CONFIGS[modelId];
  if (!config) throw new Error(`Unknown model: ${modelId}`);

  const apiKey = await getUserApiKey(config.provider, supabase, userId);
  const baseUrl = PROVIDER_BASE_URLS[config.provider];
  return callOpenAICompatibleRaw<T>(baseUrl, apiKey, config.apiModel, systemPrompt, userPrompt);
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

    await supabase.from("simulations").update({ status: "running" }).eq("id", simulationId);

    const campaignName = simulation.campaign_snapshot.name;
    const campaignContent = simulation.campaign_snapshot.content;
    const socialPlatform = simulation.campaign_snapshot.social_platform || "twitter";
    const language = simulation.campaign_snapshot.language || "en";
    const targetGroupName = simulation.target_group_snapshot.name;
    const targetGroupDescription = simulation.target_group_snapshot.description;
    const personaCount = simulation.target_group_snapshot.persona_count;

    // === KROK 1: Generování reakcí (s retry pokud LLM vrátí méně než požadováno) ===
    const MAX_GENERATION_ATTEMPTS = 2;
    let generationResponse: GenerationResponse = { reactions: [] };
    try {
      for (let attempt = 1; attempt <= MAX_GENERATION_ATTEMPTS; attempt++) {
        const { systemPrompt, userPrompt } = buildGenerationPrompts(
          campaignName, campaignContent, socialPlatform,
          targetGroupName, targetGroupDescription, personaCount, language
        );

        generationResponse = await callLLM<GenerationResponse>(
          modelId, systemPrompt, userPrompt, supabase, simulation.user_id
        );
        console.log(`Attempt ${attempt}: Generated ${generationResponse.reactions.length}/${personaCount} reactions`);

        if (generationResponse.reactions.length >= personaCount) break;

        if (attempt < MAX_GENERATION_ATTEMPTS) {
          console.log(`Retrying — expected ${personaCount}, got ${generationResponse.reactions.length}`);
        }
      }
    } catch (apiError) {
      console.error("Generation LLM call failed:", apiError);
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

    // === KROK 2: Nezávislé hodnocení metrik ===
    let evaluationResponse: EvaluationResponse = { evaluations: [] };
    try {
      const { systemPrompt, userPrompt } = buildEvaluationPrompts(
        campaignName, campaignContent, socialPlatform,
        targetGroupName, targetGroupDescription,
        generationResponse.reactions
      );

      evaluationResponse = await callLLM<EvaluationResponse>(
        modelId, systemPrompt, userPrompt, supabase, simulation.user_id
      );
      console.log(`Evaluated ${evaluationResponse.evaluations.length} reactions`);
    } catch (apiError) {
      console.error("Evaluation LLM call failed:", apiError);
      await supabase.from("simulations").update({
        status: "failed",
        error_message: `Evaluation failed: ${apiError instanceof Error ? apiError.message : String(apiError)}`,
        finished_at: new Date().toISOString(),
      }).eq("id", simulationId);

      return new Response(
        JSON.stringify({ error: "Evaluation LLM call failed", details: String(apiError) }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // === KROK 3: Spojení reakcí s hodnocením ===
    const evaluationMap = new Map(
      evaluationResponse.evaluations.map((e) => [e.persona_name, e])
    );

    const resultsToInsert = generationResponse.reactions.map((r) => {
      const scores = evaluationMap.get(r.persona_name);
      return {
        simulation_id: simulationId,
        persona_name: r.persona_name,
        content: r.content,
        sentiment: r.sentiment,
        relevance_score: scores?.relevance_score ?? 0,
        toxicity_score: scores?.toxicity_score ?? 0,
        purchase_intent: scores?.purchase_intent ?? 0,
      };
    });

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
      JSON.stringify({ success: true, simulationId, reactionCount: generationResponse.reactions.length }),
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
