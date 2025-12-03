import { generateObject } from "ai";
import { gateway } from "@ai-sdk/gateway";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

// Schema for persona reactions
const PersonaReactionSchema = z.object({
  persona_name: z.string(),
  content: z.string(),
  sentiment: z.enum(["positive", "negative", "neutral"]),
  relevance_score: z.number().min(0).max(1),
  toxicity_score: z.number().min(0).max(1),
});

const LLMResponseSchema = z.object({
  reactions: z.array(PersonaReactionSchema),
});

interface RequestBody {
  simulationId: string;
  secretKey: string;
}

// Secret key to verify requests from Supabase Edge Function
const EDGE_FUNCTION_SECRET = process.env.EDGE_FUNCTION_SECRET;

export async function POST(request: Request) {
  try {
    const body: RequestBody = await request.json();
    const { simulationId, secretKey } = body;

    // Verify the request is from our Edge Function
    if (!EDGE_FUNCTION_SECRET || secretKey !== EDGE_FUNCTION_SECRET) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!simulationId) {
      return Response.json({ error: "simulationId is required" }, { status: 400 });
    }

    // Get simulation data from Supabase
    const supabase = await createClient();
    
    const { data: simulation, error: simError } = await supabase
      .from("simulations")
      .select("*")
      .eq("id", simulationId)
      .single();

    if (simError || !simulation) {
      return Response.json({ error: "Simulation not found" }, { status: 404 });
    }

    const modelId = simulation.model || "xai/grok-3-mini-fast";
    const campaignSnapshot = simulation.campaign_snapshot;
    const targetGroupSnapshot = simulation.target_group_snapshot;

    // Build prompts
    const platformDisplayNames: Record<string, string> = {
      twitter: "Twitter/X",
      facebook: "Facebook",
      instagram: "Instagram",
      linkedin: "LinkedIn",
      tiktok: "TikTok",
    };

    const socialPlatform = campaignSnapshot.social_platform || "twitter";
    const platformName = platformDisplayNames[socialPlatform] || socialPlatform;
    const personaCount = targetGroupSnapshot.persona_count;

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

SCORING GUIDELINES:
- relevance_score (0.0-1.0): How relevant is this campaign to the persona's needs/interests
- toxicity_score (0.0-1.0): How toxic/offensive is the reaction (should typically be low)

Requirements:
- ALL reactions MUST be in first-person (I/my/me), never third-person
- Be realistic and honest - not all personas will react positively
- Write in a natural, conversational tone`;

    const userPrompt = `Generate ${personaCount} persona reactions for the following marketing campaign on ${platformName}:

CAMPAIGN NAME: ${campaignSnapshot.name}

CAMPAIGN CONTENT:
${campaignSnapshot.content}

TARGET GROUP: ${targetGroupSnapshot.name}
TARGET GROUP DESCRIPTION:
${targetGroupSnapshot.description}

Generate exactly ${personaCount} unique personas. Each persona should write their reaction in FIRST PERSON as if commenting on ${platformName}.`;

    // Call AI Gateway
    console.log(`Calling AI Gateway with model: ${modelId}`);
    
    const result = await generateObject({
      model: gateway(modelId),
      schema: LLMResponseSchema,
      system: systemPrompt,
      prompt: userPrompt,
      temperature: 0.7,
    });

    console.log(`Generated ${result.object.reactions.length} reactions`);

    return Response.json({
      success: true,
      reactions: result.object.reactions,
      model: modelId,
    });

  } catch (error) {
    console.error("LLM API error:", error);
    return Response.json(
      { 
        error: "Failed to generate reactions", 
        details: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}

