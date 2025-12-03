"use client";

import { useState } from "react";
import { CampaignsTable } from "./CampaignsTable";
import { TargetGroupsTable } from "./TargetGroupsTable";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus, Play } from "lucide-react";
import { runSimulation } from "@/app/simulations/actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface Campaign {
  id: string;
  name: string;
  content: string;
  user_id: string;
  created_at: string;
}

interface TargetGroup {
  id: string;
  name: string;
  description: string;
  persona_count: number;
  user_id: string;
  created_at: string;
}

interface DashboardClientProps {
  campaigns: Campaign[];
  targetGroups: TargetGroup[];
}

const socialPlatforms = [
  { value: "twitter", label: "Twitter / X" },
  { value: "facebook", label: "Facebook" },
  { value: "instagram", label: "Instagram" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "tiktok", label: "TikTok" },
] as const;

const llmModels = [
  { value: "xai/grok-3-mini-fast", label: "Grok 3 Mini Fast", provider: "xAI" },
  { value: "xai/grok-3-fast", label: "Grok 3 Fast", provider: "xAI" },
  { value: "openai/gpt-4o-mini", label: "GPT-4o Mini", provider: "OpenAI" },
  { value: "openai/gpt-4o", label: "GPT-4o", provider: "OpenAI" },
  { value: "anthropic/claude-3-5-haiku-latest", label: "Claude 3.5 Haiku", provider: "Anthropic" },
  { value: "anthropic/claude-sonnet-4-20250514", label: "Claude Sonnet 4", provider: "Anthropic" },
  { value: "google/gemini-2.0-flash", label: "Gemini 2.0 Flash", provider: "Google" },
  { value: "google/gemini-2.5-flash-preview-05-20", label: "Gemini 2.5 Flash", provider: "Google" },
] as const;

export function DashboardClient({
  campaigns,
  targetGroups,
}: DashboardClientProps) {
  const router = useRouter();
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(
    null
  );
  const [selectedTargetGroupId, setSelectedTargetGroupId] = useState<
    string | null
  >(null);
  const [selectedPlatform, setSelectedPlatform] = useState<string>("twitter");
  const [selectedModel, setSelectedModel] = useState<string>("xai/grok-3-mini-fast");
  const [isRunning, setIsRunning] = useState(false);

  const handleSelectCampaign = (campaignId: string) => {
    setSelectedCampaignId(campaignId);
  };

  const handleSelectTargetGroup = (targetGroupId: string) => {
    setSelectedTargetGroupId(targetGroupId);
  };

  const handleRunSimulation = async () => {
    if (!selectedCampaignId || !selectedTargetGroupId) {
      toast.error("Please select both a campaign and a target group");
      return;
    }

    setIsRunning(true);

    try {
      const result = await runSimulation(
        selectedCampaignId,
        selectedTargetGroupId,
        selectedPlatform,
        selectedModel
      );

      if (result.success && result.simulationId) {
        toast.success("Simulation started successfully!");
        // Redirect to simulation detail page (to be created later)
        router.push(`/simulations/${result.simulationId}`);
      } else {
        toast.error(result.error || "Failed to start simulation");
      }
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-2">Welcome to your dashboard</p>
        </div>
        <Button
          size="lg"
          disabled={!selectedCampaignId || !selectedTargetGroupId || isRunning}
          onClick={handleRunSimulation}
        >
          <Play className="mr-2 h-5 w-5" />
          {isRunning ? "Starting..." : "Run Simulation"}
        </Button>
      </div>

      {/* Social Platform Selection */}
      <div className="mb-8 mt-6">
        <h2 className="text-xl font-semibold mb-3">Social Media Platform</h2>
        <div className="flex flex-wrap gap-3">
          {socialPlatforms.map((platform) => (
            <Button
              key={platform.value}
              type="button"
              variant={selectedPlatform === platform.value ? "default" : "outline"}
              className={cn(
                "flex-1 min-w-[150px]",
                selectedPlatform === platform.value && "ring-2 ring-primary"
              )}
              onClick={() => setSelectedPlatform(platform.value)}
            >
              {platform.label}
            </Button>
          ))}
        </div>
      </div>

      {/* LLM Model Selection */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-3">AI Model</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Choose the language model to generate persona reactions
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {llmModels.map((model) => (
            <Button
              key={model.value}
              type="button"
              variant={selectedModel === model.value ? "default" : "outline"}
              className={cn(
                "flex flex-col h-auto py-3 px-4",
                selectedModel === model.value && "ring-2 ring-primary"
              )}
              onClick={() => setSelectedModel(model.value)}
            >
              <span className="font-medium">{model.label}</span>
              <span className="text-xs opacity-70">{model.provider}</span>
            </Button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 mt-8">
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">
              Campaigns ({campaigns.length})
            </h2>
            <Button asChild size="sm">
              <Link href="/campaigns/new">
                <Plus className="mr-2 h-4 w-4" />
                New Campaign
              </Link>
            </Button>
          </div>
          <CampaignsTable
            campaigns={campaigns}
            selectedCampaignId={selectedCampaignId}
            onSelectCampaign={handleSelectCampaign}
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">
              Target Groups ({targetGroups.length})
            </h2>
            <Button asChild size="sm">
              <Link href="/target-groups/new">
                <Plus className="mr-2 h-4 w-4" />
                New Target Group
              </Link>
            </Button>
          </div>
          <TargetGroupsTable
            targetGroups={targetGroups}
            selectedTargetGroupId={selectedTargetGroupId}
            onSelectTargetGroup={handleSelectTargetGroup}
          />
        </div>
      </div>
    </div>
  );
}
