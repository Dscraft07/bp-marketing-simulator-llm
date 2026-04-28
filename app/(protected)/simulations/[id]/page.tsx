import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SimulationResults } from "./components/SimulationResults";

interface SimulationPageProps {
  params: Promise<{
    id: string;
  }>;
}

interface Simulation {
  id: string;
  status: "pending" | "running" | "completed" | "failed";
  created_at: string;
  finished_at: string | null;
  error_message: string | null;
  model: string | null;
  temperature: number | null;
  campaign_snapshot: {
    name: string;
    content: string;
    social_platform?: string;
  };
  target_group_snapshot: {
    name: string;
    description: string;
    persona_count: number;
  };
}

interface SimulationResult {
  id: string;
  persona_name: string;
  content: string;
  sentiment: "positive" | "negative" | "neutral";
  relevance_score: number | null;
  toxicity_score: number | null;
  purchase_intent: number | null;
  diversity_score: number | null;
  created_at: string;
}

async function getSimulation(id: string): Promise<Simulation | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from("simulations")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !data) {
    return null;
  }

  return data as Simulation;
}

async function getSimulationResults(
  simulationId: string
): Promise<SimulationResult[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("simulation_results")
    .select("*")
    .eq("simulation_id", simulationId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Failed to fetch simulation results:", error);
    return [];
  }

  return (data || []) as SimulationResult[];
}

function getStatusBadge(status: Simulation["status"]) {
  const variants: Record<
    Simulation["status"],
    { variant: "default" | "secondary" | "destructive" | "outline"; label: string }
  > = {
    pending: { variant: "secondary", label: "Pending" },
    running: { variant: "default", label: "Running" },
    completed: { variant: "outline", label: "Completed" },
    failed: { variant: "destructive", label: "Failed" },
  };

  const config = variants[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

function getSocialPlatformLabel(platform?: string): string {
  const labels: Record<string, string> = {
    twitter: "Twitter / X",
    facebook: "Facebook",
    instagram: "Instagram",
    linkedin: "LinkedIn",
    tiktok: "TikTok",
  };

  return platform ? labels[platform] || platform : "Unknown";
}

function getModelDisplayName(modelId?: string | null): string {
  if (!modelId) return "Unknown";
  
  const modelNames: Record<string, string> = {
    "xai/grok-3-mini-fast": "Grok 3 Mini Fast",
    "xai/grok-3-fast": "Grok 3 Fast",
    "openai/gpt-4o-mini": "GPT-4o Mini",
    "openai/gpt-4o": "GPT-4o",
  };

  return modelNames[modelId] || modelId;
}

export default async function SimulationPage({ params }: SimulationPageProps) {
  const { id } = await params;
  const [simulation, initialResults] = await Promise.all([
    getSimulation(id),
    getSimulationResults(id),
  ]);

  if (!simulation) {
    notFound();
  }

  const createdDate = new Date(simulation.created_at).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const finishedDate = simulation.finished_at
    ? new Date(simulation.finished_at).toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  const durationSeconds = simulation.finished_at
    ? Math.floor(
        (new Date(simulation.finished_at).getTime() -
          new Date(simulation.created_at).getTime()) /
          1000
      )
    : null;

  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  };

  return (
    <div className="container mx-auto py-6 max-w-5xl">
      {/* Hero Section */}
      <div className="mb-8 p-6 bg-gradient-to-br from-primary/10 via-primary/5 to-background rounded-xl border">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold">
                {simulation.campaign_snapshot.name}
              </h1>
              {getStatusBadge(simulation.status)}
            </div>
            <p className="text-sm text-muted-foreground">
              {createdDate}
              {finishedDate && ` • Finished ${finishedDate}`}
              {durationSeconds !== null && ` • Duration: ${formatDuration(durationSeconds)}`}
            </p>
          </div>
        </div>

        {/* Campaign Content */}
        <div className="bg-background/50 rounded-lg p-4 mb-3">
          <p className="text-sm text-muted-foreground mb-1">Campaign Message</p>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">
            {simulation.campaign_snapshot.content}
          </p>
        </div>

        {/* Compact Info Row */}
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">Platform:</span>
            <span className="font-medium">
              {getSocialPlatformLabel(simulation.campaign_snapshot.social_platform)}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">Target:</span>
            <span className="font-medium">
              {simulation.target_group_snapshot.name}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">Personas:</span>
            <span className="font-medium">
              {simulation.target_group_snapshot.persona_count}
            </span>
          </div>
          {simulation.model && (
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">Model:</span>
              <span className="font-medium">{getModelDisplayName(simulation.model)}</span>
            </div>
          )}
        </div>
      </div>

      {simulation.error_message && (
        <Card className="mb-6 border-destructive bg-destructive/5">
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">{simulation.error_message}</p>
          </CardContent>
        </Card>
      )}

      {/* Real-time Results */}
      <SimulationResults
        simulationId={simulation.id}
        initialResults={initialResults}
        simulationStatus={simulation.status}
        createdAt={simulation.created_at}
        model={simulation.model}
        personaCount={simulation.target_group_snapshot.persona_count}
        campaignSnapshot={simulation.campaign_snapshot}
        targetGroupSnapshot={simulation.target_group_snapshot}
      />
    </div>
  );
}
