"use client";

import { useState } from "react";
import { CampaignsTable } from "./CampaignsTable";
import { TargetGroupsTable } from "./TargetGroupsTable";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus, Play } from "lucide-react";

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

export function DashboardClient({
  campaigns,
  targetGroups,
}: DashboardClientProps) {
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(
    null
  );
  const [selectedTargetGroupId, setSelectedTargetGroupId] = useState<
    string | null
  >(null);

  const handleSelectCampaign = (campaignId: string) => {
    setSelectedCampaignId(campaignId);
  };

  const handleSelectTargetGroup = (targetGroupId: string) => {
    setSelectedTargetGroupId(targetGroupId);
  };

  const handleRunSimulation = () => {
    // TODO: Implement simulation logic
    console.log("Running simulation", {
      campaignId: selectedCampaignId,
      targetGroupId: selectedTargetGroupId,
    });
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
          disabled={!selectedCampaignId || !selectedTargetGroupId}
          onClick={handleRunSimulation}
        >
          <Play className="mr-2 h-5 w-5" />
          Run Simulation
        </Button>
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
