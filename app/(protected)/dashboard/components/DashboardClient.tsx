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
        selectedPlatform
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
